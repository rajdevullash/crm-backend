// server/services/socketService.ts
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";


let io: SocketIOServer;

export const initializeSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        "http://localhost:3000", 
        "https://crm-datapollex.vercel.app",
        "https://crm-frontend-two-indol.vercel.app",
        "https://crm-frontend-8lvn.onrender.com",
        "https://app.datapollex.com",
        "https://api.datapollex.com",
        "https://www.app.datapollex.com",
        "https://www.api.datapollex.com"
        ],
      methods: ["GET", "POST"],
      credentials: true,
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
      const userRoom = `user_${user.userId}`;
      const roleRoom = `role_${user.role}`;
      socket.join(userRoom);
      socket.join(roleRoom);
      
      // Verify rooms were joined (check immediately after join)
      setTimeout(() => {
        const userRoomSockets = io.sockets.adapter.rooms.get(userRoom);
        const roleRoomSockets = io.sockets.adapter.rooms.get(roleRoom);
        console.log(`✅ User ${user.email} (${user.role}) joined rooms:`);
        console.log(`   - ${userRoom}: ${userRoomSockets?.size || 0} socket(s)`);
        console.log(`   - ${roleRoom}: ${roleRoomSockets?.size || 0} socket(s)`);
      }, 100);
    } else {
      console.log("⚠️ Socket connected but no user data available");
    }

    // Handle explicit room join request from frontend (backup)
    socket.on("join:user", (data: { userId: string }) => {
      const userRoom = `user_${data.userId}`;
      socket.join(userRoom);
      console.log(`🚪 Socket ${socket.id} explicitly joined room: ${userRoom}`);
    });

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
    console.log(`🔊 Emitting ${event} to rooms:`, targetRooms);
    let hasEmptyRooms = false;
    
    targetRooms.forEach((room) => {
      // Check room membership using adapter
      const roomSockets = socketIO.sockets.adapter.rooms.get(room);
      const socketCount = roomSockets ? roomSockets.size : 0;
      
      console.log(`  → Emitting to room: ${room} (${socketCount} socket(s) in room)`);
      if (socketCount > 0 && roomSockets) {
        console.log(`     Socket IDs:`, Array.from(roomSockets));
      } else {
        hasEmptyRooms = true;
      }
      
      // Emit to room
      socketIO.to(room).emit(event, data);
    });
    
    // Fallback: if all rooms are empty, broadcast to all connected sockets
    // This handles cases where room joining might have timing issues
    if (hasEmptyRooms) {
      const totalSockets = socketIO.sockets.sockets.size;
      console.log(`⚠️  Some rooms were empty. Total connected sockets: ${totalSockets}`);
      console.log(`   Broadcasting ${event} to all sockets as fallback`);
      socketIO.emit(event, data);
    }
  } else {
    // Broadcast to all connected sockets if no rooms specified
    console.log(`🔊 Broadcasting ${event} to all sockets`);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emitNotificationEvent = (event: string, data: any, targetRooms?: string[]) => {
  const socketIO = getIO();
  if (targetRooms?.length) {
    targetRooms.forEach((room) => socketIO.to(room).emit(event, data));
  } else {
    socketIO.emit(event, data);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emitLeadEvent = (event: string, data: any, targetRooms?: string[]) => {
  const socketIO = getIO();
  if (targetRooms?.length) {
    targetRooms.forEach((room) => socketIO.to(room).emit(event, data));
  } else {
    socketIO.emit(event, data);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emitStageEvent = (event: string, data: any, targetRooms?: string[]) => {
  const socketIO = getIO();
  if (targetRooms?.length) {
    targetRooms.forEach((room) => socketIO.to(room).emit(event, data));
  } else {
    socketIO.emit(event, data);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const emitActivityEvent = (event: string, data: any, targetRooms?: string[]) => {
  const socketIO = getIO();
  console.log(`📢 Emitting activity event: ${event}`, {
    targetRooms,
    activityType: data.activity?.type,
    leadTitle: data.lead?.title,
  });
  
  if (targetRooms?.length) {
    targetRooms.forEach((room) => {
      const socketCount = socketIO.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`  → Emitting to room: ${room} (${socketCount} socket(s))`);
      socketIO.to(room).emit(event, data);
    });
  } else {
    console.log(`  → Broadcasting to all sockets`);
    socketIO.emit(event, data);
  }
};
