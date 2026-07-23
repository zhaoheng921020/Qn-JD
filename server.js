const http = require("http");
const fs = require("fs");
const path = require("path");

const targetHost = "https://8.137.162.161";
const targetPort = 8080;
const localPort = 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url.startsWith("/api/")) {
    const proxyHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key !== "host" && key !== "connection") {
        proxyHeaders[key] = value;
      }
    }

    const proxyReq = http.request(
      {
        hostname: targetHost,
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: proxyHeaders
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      console.error("Proxy error:", err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Proxy error: " + err.message }));
    });

    req.pipe(proxyReq);
  } else {
    let filePath = path.join(
      __dirname,
      req.url === "/" ? "index.html" : req.url
    );

    const extname = path.extname(filePath);
    let contentType = "text/html";
    switch (extname) {
      case ".js":
        contentType = "text/javascript";
        break;
      case ".css":
        contentType = "text/css";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".woff":
        contentType = "font/woff";
        break;
      case ".ttf":
        contentType = "font/ttf";
        break;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === "ENOENT") {
          res.writeHead(404);
          res.end("File not found");
        } else {
          res.writeHead(500);
          res.end("Server error: " + error.code);
        }
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  }
});

server.listen(localPort, () => {
  console.log(`Server running on http://localhost:${localPort}`);
  console.log(`API proxy forwarding to http://${targetHost}:${targetPort}`);
});
