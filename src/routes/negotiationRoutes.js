const express = require("express");
const router = express.Router();
const { createNegotiation } = require("../controllers/negotiationController");
const { authMiddleware, restrictTo } = require("../middleware/authMiddleware");

// Create a new negotiation (Buyer only)
router.post("/", authMiddleware, restrictTo("buyer"), createNegotiation);

module.exports = router;
