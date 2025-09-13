const Bid = require("../models/Bid");
const Notification = require("../models/Notification");
const Negotiation = require("../models/Negotiation");

// Place a new bid
exports.placeBid = async (req, res) => {
  try {
    const { negotiationId, offeredPrice } = req.body;

    const negotiation = await Negotiation.findById(negotiationId).populate("productId");
    if (!negotiation || negotiation.status !== "active") {
      return res.status(400).json({ success: false, error: "Invalid or inactive negotiation" });
    }

    const product = negotiation.productId;
    if (!product.isBiddable) {
      return res.status(400).json({ success: false, error: "Product not available for bidding" });
    }

    const bid = await Bid.create({
      productId: product._id,
      buyerId: req.user._id,
      farmerId: product.farmerId,
      initialPrice: product.price,
      offeredPrice,
      negotiationId: negotiation._id.toString(),
    });

    // Notify farmer
    await Notification.create({
      userId: product.farmerId,
      type: "new_bid",
      message: `New bid of Rs. ${offeredPrice} placed by ${req.user.firstName}`,
    });

    req.io?.to(`user_${product.farmerId}`).emit("bidNotification", {
      type: "new_bid",
      message: `New bid of Rs. ${offeredPrice} placed by ${req.user.firstName}`,
      bid,
    });

    // Emit bid update in negotiation room
    req.io?.to(negotiation._id.toString()).emit("bidUpdate", bid);

    res.status(201).json({ success: true, bid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Counter a bid (Farmer only)
exports.counterBid = async (req, res) => {
  try {
    const { offeredPrice } = req.body;
    const bid = await Bid.findById(req.params.id);

    if (!bid || bid.status !== "pending") {
      return res.status(400).json({ success: false, error: "Invalid bid" });
    }

    bid.offeredPrice = offeredPrice;
    bid.status = "countered";
    await bid.save();

    await Notification.create({
      userId: bid.buyerId,
      type: "counter_offer",
      message: `Farmer countered your bid with Rs. ${offeredPrice}`,
    });

    req.io?.to(`user_${bid.buyerId}`).emit("bidNotification", {
      type: "counter_offer",
      message: `Farmer countered your bid with Rs. ${offeredPrice}`,
      bid,
    });

    req.io?.to(bid.negotiationId).emit("bidUpdate", bid);

    res.json({ success: true, bid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Farmer accepts a buyer's offer
exports.acceptBid = async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) return res.status(404).json({ success: false, error: "Bid not found" });

    if (bid.status !== "pending") {
      return res.status(400).json({ success: false, error: bid.status === "accepted" ? "Bid already accepted" : "Only pending bids can be accepted" });
    }

    bid.status = "accepted";
    await bid.save();

    // Close the negotiation
    await Negotiation.findByIdAndUpdate(bid.negotiationId, { status: "closed" });

    // Notify buyer
    await Notification.create({
      userId: bid.buyerId,
      type: "bid_accepted",
      message: `Your bid of Rs. ${bid.offeredPrice} was accepted by the farmer`,
    });

    req.io?.to(`user_${bid.buyerId}`).emit("bidNotification", {
      type: "bid_accepted",
      message: `Your bid of Rs. ${bid.offeredPrice} was accepted by the farmer`,
      bid,
    });

    req.io?.to(bid.negotiationId).emit("bidUpdate", bid);

    res.json({ success: true, bid });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Buyer accepts a farmer's counter-offer
exports.acceptBidBuyer = async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) return res.status(404).json({ success: false, error: "Bid not found" });

    if (bid.status !== "countered") {
      return res.status(400).json({ success: false, error: bid.status === "accepted" ? "Bid already accepted" : "Only countered bids can be accepted by buyer" });
    }

    bid.status = "accepted";
    await bid.save();

    // Close the negotiation
    await Negotiation.findByIdAndUpdate(bid.negotiationId, { status: "closed" });

    // Notify farmer
    await Notification.create({
      userId: bid.farmerId,
      type: "bid_accepted",
      message: `Your counter-offer of Rs. ${bid.offeredPrice} was accepted by the buyer`,
    });

    req.io?.to(`user_${bid.farmerId}`).emit("bidNotification", {
      type: "bid_accepted",
      message: `Your counter-offer of Rs. ${bid.offeredPrice} was accepted by the buyer`,
      bid,
    });

    req.io?.to(bid.negotiationId).emit("bidUpdate", bid);

    res.json({ success: true, bid });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Get bids for a product
exports.getBidsForProduct = async (req, res) => {
  try {
    const bids = await Bid.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
