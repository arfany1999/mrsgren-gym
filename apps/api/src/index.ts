import http from "http";
import { Server as SocketServer } from "socket.io";
import { app } from "./app";
import { registerSocketHandlers } from "./sockets";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

export const io = new SocketServer(server, {
  cors: { origin: process.env.WEB_URL || "http://localhost:3000", credentials: true },
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
