// railway-wrapper.mjs
import http from "http";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { URL } from "url";

const PORT = Number(process.env.PORT || 8080);
const GATEWAY_HOST = process.env.INTERNAL_GATEWAY_HOST || "127.0.0.1";
const GATEWAY_PORT = Number(process.env.INTERNAL_GATEWAY_PORT || 18789);

// Simple health endpoint for Railway
const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    return res.end("bad request");
  }

  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }

  // Proxy all other HTTP requests to the gateway
  const targetUrl = new URL(`http://${GATEWAY_HOST}:${GATEWAY_PORT}${req.url}`);

  const proxyReq = httpRequest(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: `${GATEWAY_HOST}:${GATEWAY_PORT}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Railway wrapper listening on http://0.0.0.0:${PORT}`);
  console.log(`Proxying HTTP to gateway at http://${GATEWAY_HOST}:${GATEWAY_PORT}`);
});
