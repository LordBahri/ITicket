import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { chatBus } from "./chatBus";
import { notificationBus } from "./notificationBus";

function isStaff(role: string) {
  return role === "AGENT" || role === "ADMIN";
}

export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentification requise"));
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Token invalide ou expiré"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as string;

    socket.join(`user:${userId}`);
    if (isStaff(role)) {
      socket.join("staff-inbox");
    }

    socket.on("chat:join-thread", async (threadId: string) => {
      if (typeof threadId !== "string") return;
      const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
      if (!thread) return;
      if (!isStaff(role) && thread.userId !== userId) return;
      socket.join(`thread:${threadId}`);
    });

    socket.on("chat:leave-thread", (threadId: string) => {
      if (typeof threadId === "string") socket.leave(`thread:${threadId}`);
    });
  });

  chatBus.on("message", ({ threadId, threadOwnerId, message }) => {
    io.to(`thread:${threadId}`).emit("chat:message", { threadId, message });
    io.to("staff-inbox").emit("chat:message-summary", { threadId, message });
    io.to(`user:${threadOwnerId}`).emit("chat:message-summary", { threadId, message });
  });

  chatBus.on("thread-created", ({ thread }) => {
    io.to("staff-inbox").emit("chat:thread-created", thread);
  });

  notificationBus.on("notification", ({ userId, notification }) => {
    io.to(`user:${userId}`).emit("notification:new", notification);
  });

  return io;
}
