require('dotenv').config(); 

const path = require("path");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require('helmet');
const multer = require("multer");

// Middlewares
const loggerMiddleware = require("./src/middleware/loggerMiddleware");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();

app.use(bodyParser.json());

app.use(helmet()); // Security headers
app.use(
    cors({
      origin: process.env.FRONTEND_URL || "*",
    credentials: true,
 })
);
app.use(express.json({limit: "1mb"}));
app.use(loggerMiddleware);

// API Creation
app.get("/", (req, res) => {
  res.send("Welcome to Annapur Backend!");
});

//Image Upload setup
const uploadDir = path.join(__dirname, "upload", "images");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });


//Image Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req,file, cb)=>
         cb(null, `product_${Date.now()}${path.extname(file.originalname)}`),
    
});

// Multer in-memory storage
const upload = multer({ storage });

//Creating Upload Endpoint for images
app.use('/images',express.static(uploadDir));
app.post("/upload", upload.single("product"),(req, res)=>{

  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
    
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    res.json({
        success: true,
        image_url: imageUrl
    });
});

const paymentRoutes = require("./src/routes/paymentRoutes");
const searchRoutes = require("./src/routes/searchRoutes");

// Routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/products", require("./src/routes/productRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/cart", require("./src/routes/cartRoutes"));
app.use("/api/orders", require("./src/routes/orderRoutes"));

app.use("/api/payment", paymentRoutes);

app.use("/api/searches", searchRoutes);



app.use(errorMiddleware);

module.exports = app;
