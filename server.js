require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const {app, server, io} = require("./index");
const connectDB = require("./src/config/db");
const User = require("./src/models/User");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        credentials: true,
      },
    });

    // Middleware to inject io into req
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Socket.IO authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error("Authentication token missing"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
          return next(new Error("User not found"));
        }

        socket.user = user; // attach user to socket
        next();
      } catch (err) {
        next(new Error("Authentication failed"));
      }
    });

    // Socket.IO events
    io.on("connection", (socket) => {
      console.log(" User Connected:", socket.id, "User:", socket.user?.email);

      // Join negotiation room
      socket.on("joinNegotiation", (negotiationId) => {
        socket.join(negotiationId);
        console.log(` ${socket.user?.email} joined negotiation room: ${negotiationId}`);
      });

      // Register user for personal notifications
      socket.on("registerUser", () => {
        const userId = socket.user?._id;
        if (userId) {
          socket.join(`user_${userId}`);
          console.log(`Registered ${socket.user?.email} for notifications as user_${userId}`);
        }
      });

      // Optional: Listen for new bid events
      socket.on("newBid", (data) => {
        console.log("New bid received:", data);
        io.to(data.negotiationId).emit("bidUpdate", data);
      });

      socket.on("disconnect", () => {
        console.log(" User disconnected:", socket.id);
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(" Failed to start server:", err.message);
    process.exit(1);
  }
})();
