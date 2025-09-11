// src/scripts/seedProducts.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const Product = require("../models/product");
const User = require("../models/User");
const products = require("../data/market-products.json");

(async () => {
  try {
    // 1) Connect to DB
    await connectDB();

    // 2) Ensure a farmer user exists
    let farmer = await User.findOne({ role: "farmer" });
    if (!farmer) {
      farmer = await User.create({
        name: "Default Farmer",
        email: "farmer@example.com",
        password: "password123", // ⚠️ plain for seeding, hash in pre-save
        role: "farmer",
      });
      console.log("Created default farmer:", farmer.email);
    }

    // 3) Clear old products
    await Product.deleteMany({});
    console.log("Existing products removed");

    // 4) Insert new products with farmerId
    const cleanedProducts = products.map((p, idx) => {
      let price = p.price;

      if (typeof price === "string") {
        // Extracts numeric part (e.g., 60 from Rs.60)
        const match = price.match(/\d+(\.\d+)?/);
        price = match ? Number(match[0]) : 0;
      }

      return {
        ...p,
        name: p.name?.trim() || `Product ${idx + 1}`,
        category: p.category?.trim() || "Uncategorized",
        short_description: p.short_description?.trim() || "No description available",
        price,
        farmerId: farmer._id, // 👈 assign farmerId
      };
    });

    await Product.insertMany(cleanedProducts);
    console.log(`Inserted ${cleanedProducts.length} products successfully`);

    process.exit();
  } catch (error) {
    console.error("Error seeding products:", error.message);
    process.exit(1);
  }
})();