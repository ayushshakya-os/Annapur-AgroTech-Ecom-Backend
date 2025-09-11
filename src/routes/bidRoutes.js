const express = require("express");
const { authMiddleware, blockGuests, restrictToNegotiationParticipants } = require("../middleware/authMiddleware");
const { placeBid, getBids } = require("../controllers/bidController");
const Negotiation = require("../models/Negotiation");

const router = express.Router();

// Place bid (buyer or farmer)
router.post("/", authMiddleware, blockGuests, placeBid);

// Get all bids for a negotiation (participants only)
router.get("/:negotiationId", authMiddleware, restrictToNegotiationParticipants(
  async (req) => await Negotiation.findById(req.params.negotiationId)
), getBids);

module.exports = router;
