import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;
const PUBLIC_DIR = path.join(import.meta.dirname, "public");
 
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};
 
const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const requested = pathname === "/" ? "/index.html" : pathname;
 
  const filePath = path.join(PUBLIC_DIR, path.normalize(requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }
 
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});
 
const wss = new WebSocketServer({ server });
 
function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
 
wss.on("connection", (socket, req) => {
  const username = new URL(req.url, "http://localhost").searchParams.get(
    "username",
  );
 
  broadcast({ type: "system", text: `${username} joined` });
 
  socket.on("message", (data) => {
    try {
      const { username, text } = JSON.parse(data.toString());
      broadcast({ type: "chat", username, text });
    } catch (err) {
      console.error("Invalid message received:", err.message);
    }
  });
 
  socket.on("close", () => {
    broadcast({ type: "system", text: `${username} left` });
  });
});
 
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
 