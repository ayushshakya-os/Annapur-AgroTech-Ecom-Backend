
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./index");
const connectDB = require("./src/config/db");


const PORT = process.env.PORT || 5000;

(async () => {
    try{
        await connectDB();

        const server = http.createServer(app);

        const io = new Server(server, {
            cors: { origin: process.env.FRONTEND_URL || "*",
                credentials: true,
            },
        });

        //Middleware to inject io into req
        app.use((req, res, next) =>{
            req.io = io;
            next();
        });

        // Socket.IO events
        io.on("connection", (socket) => {
            console.log("User Connected:", socket.id);

            // Negotiation room join
            socket.on("joinNegotiation", (negotiationId) => {
                socket.join(negotiationId);
                console.log(` User ${socket.id} joined negotiation ${negotiationId}`);
            });

      // Bid events
      socket.on("newBid", (data) => {
        console.log("💰 New bid:", data);
        // Broadcast to others in the same negotiation room
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
