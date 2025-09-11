const express = require("express");
const { authMiddleware, restrictTo, blockGuests, restrictToNegotiationParticipants } = require("../middleware/authMiddleware");
const { startNegotiation, acceptNegotiation, rejectNegotiation, getFarmerNegotiations } = require("../controllers/negotiationController");
const Negotiation = require("../models/Negotiation");

const router = express.Router();

// Start negotiation (only authenticated non-guests)
router.post("/start", authMiddleware, blockGuests, startNegotiation);

// Accept negotiation (only farmer)
router.post("/:id/accept", authMiddleware, restrictTo(["farmer"]), restrictToNegotiationParticipants(
  async (req) => await Negotiation.findById(req.params.id)
), acceptNegotiation);

// Reject negotiation (buyer or farmer)
router.post("/:id/reject", authMiddleware, blockGuests, restrictToNegotiationParticipants(
  async (req) => await Negotiation.findById(req.params.id)
), rejectNegotiation);

// Get all negotiations for a farmer
router.get("/farmer/:farmerId", authMiddleware, restrictTo(["farmer"]), getFarmerNegotiations);

module.exports = router;
