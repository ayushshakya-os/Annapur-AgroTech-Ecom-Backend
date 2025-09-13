const express = require("express");
const router = express.Router();
const bidController = require("../controllers/bidController");
const { authMiddleware, restrictTo, restrictToNegotiationParticipants } = require("../middleware/authMiddleware");
const {
  validatePlaceBid,
  validateCounterBid,
  validateAcceptBid,
} = require("../middleware/validateRequest");

// Place a bid (Buyer only)
router.post(
  "/place",
  authMiddleware,
  restrictTo("buyer"),
  validatePlaceBid,
  bidController.placeBid
);

// Counter a bid (Farmer only)
router.put(
  "/:id/counter",
  authMiddleware,
  restrictTo("farmer"),
  validateCounterBid,
  restrictToNegotiationParticipants(async (req) => {
    const bid = await require("../models/Bid").findById(req.params.id);
    return bid;
  }),
  bidController.counterBid
);

// Accept a bid (Farmer only)
router.put(
  "/:id/accept",
  authMiddleware,
  restrictTo("farmer"),
  validateAcceptBid,
  restrictToNegotiationParticipants(async (req) => {
    const bid = await require("../models/Bid").findById(req.params.id);
    return bid;
  }),
  bidController.acceptBid
);

// Accept a farmer's counter-offer (buyer accepts)
router.put("/:id/accept-buyer", 
  authMiddleware, 
  restrictTo("buyer"), 
  validateAcceptBid, 
  restrictToNegotiationParticipants(async (req) => {
    const bid = await require("../models/Bid").findById(req.params.id);
    return bid;
  }), 
  bidController.acceptBidBuyer
);


// Get all bids for a product (Buyer/Farmer)
router.get(
  "/product/:productId",
  authMiddleware,
  bidController.getBidsForProduct
);

module.exports = router;
