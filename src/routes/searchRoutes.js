const express = require("express");
const { searchProducts, getUserSearches, clearSearchHistory } = require("../controllers/searchController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();


//Search Products
router.post("/search", authMiddleware, searchProducts);

// Get all searches for a logged-in user
router.get("/", authMiddleware, getUserSearches);

// Clear search history
router.delete("/", authMiddleware, clearSearchHistory);

module.exports = router;
