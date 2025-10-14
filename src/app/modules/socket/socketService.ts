// server/services/socketService.ts
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";


let io: SocketIOServer;

export const initializeSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // ✅ Authentication middleware for socket.io
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log("❌ No token provided for socket connection");
        return next(new Error("Authentication error"));
      }

      const verifiedUser = jwtHelpers.verifyToken(token, config.jwt.secret as string);
      socket.data.user = verifiedUser;
      console.log("✅ Socket authentication successful for:", verifiedUser.email);
      next();
    } catch (err) {
      if (err instanceof Error) {
        console.log("❌ Socket authentication failed:", err.message);
      } else {
        console.log("❌ Socket authentication failed:", err);
      }
      next(new Error("Authentication error"));
    }
  });

  // ✅ Connection event
  io.on("connection", (socket) => {
    console.log("⚡ Socket connected:", socket.id);

    // optional: join user-based and role-based rooms
    const user = socket.data.user;
    if (user) {
      socket.join(`user_${user.userId}`);
      socket.join(`role_${user.role}`);
    }

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emitTaskEvent = (event: string, data: any, targetRooms?: string[]) => {
  const socketIO = getIO();
  if (targetRooms?.length) {
    targetRooms.forEach((room) => socketIO.to(room).emit(event, data));
  } else {
    socketIO.emit(event, data);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emitDashboardEvent = (event: string, data: any, targetRooms?: string[]) => {
  const socketIO = getIO();
  if (targetRooms?.length) {
    targetRooms.forEach((room) => socketIO.to(room).emit(event, data));
  } else {
    socketIO.emit(event, data);
  }
};
