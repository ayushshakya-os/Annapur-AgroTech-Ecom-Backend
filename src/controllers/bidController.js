const Bid = require("../models/Bid");
const Notification = require("../models/Notification");
const Negotiation = require("../models/Negotiation");

// Place a new bid
exports.placeBid = async (req, res) => {
  try {
    const { negotiationId, offeredPrice } = req.body;

    const negotiation = await Negotiation.findById(negotiationId).populate(
      "productId"
    );
    if (!negotiation || negotiation.status !== "active") {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or inactive negotiation" });
    }

    const product = negotiation.productId;
    if (!product.isBiddable) {
      return res
        .status(400)
        .json({ success: false, error: "Product not available for bidding" });
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
    if (!bid)
      return res.status(404).json({ success: false, error: "Bid not found" });

    if (bid.status !== "pending") {
      return res.status(400).json({
        success: false,
        error:
          bid.status === "accepted"
            ? "Bid already accepted"
            : "Only pending bids can be accepted",
      });
    }

    bid.status = "accepted";
    await bid.save();

    // Close the negotiation
    await Negotiation.findByIdAndUpdate(bid.negotiationId, {
      status: "closed",
    });

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
    if (!bid)
      return res.status(404).json({ success: false, error: "Bid not found" });

    if (bid.status !== "countered") {
      return res.status(400).json({
        success: false,
        error:
          bid.status === "accepted"
            ? "Bid already accepted"
            : "Only countered bids can be accepted by buyer",
      });
    }

    bid.status = "accepted";
    await bid.save();

    // Close the negotiation
    await Negotiation.findByIdAndUpdate(bid.negotiationId, {
      status: "closed",
    });

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
    const bids = await Bid.find({ productId: req.params.productId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getBidsForAuthenticatedUser = async (req, res) => {
  try {
    // Determine requested role context
    const requestedRole = (req.query.role || req.user.role || "").toLowerCase();

    if (
      requestedRole &&
      !["buyer", "farmer", "admin"].includes(requestedRole)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid role query param" });
    }

    // If the user requests a role that is not theirs and they're not admin => forbidden
    if (
      requestedRole &&
      requestedRole !== req.user.role &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Forbidden to request other user's role bids",
      });
    }

    const roleToUse = requestedRole || req.user.role;

    // Build filter
    const filter = {};
    if (roleToUse === "farmer") filter.farmerId = req.user._id;
    else if (roleToUse === "buyer") filter.buyerId = req.user._id;
    else if (roleToUse === "admin") {
      // admin: optional userId filter
      if (req.query.userId) {
        // try to infer whether userId refers to farmerId or buyerId via role param
        if (req.query.userRole === "farmer") filter.farmerId = req.query.userId;
        else if (req.query.userRole === "buyer")
          filter.buyerId = req.query.userId;
        else {
          // if userRole not provided, search both possibilities (OR)
          filter.$or = [
            { farmerId: req.query.userId },
            { buyerId: req.query.userId },
          ];
        }
      }
    }

    // Additional filters
    if (req.query.status) {
      const statuses = req.query.status.split(",").map((s) => s.trim());
      filter.status = { $in: statuses };
    }
    if (req.query.productId) filter.productId = req.query.productId;
    if (req.query.negotiationId) filter.negotiationId = req.query.negotiationId;

    // Pagination & sorting
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "-createdAt";

    const [total, bids] = await Promise.all([
      Bid.countDocuments(filter),
      Bid.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("productId", "name price farmerId isBiddable") // adjust fields as needed
        .populate("buyerId", "firstName lastName email")
        .populate("farmerId", "firstName lastName email")
        .lean(),
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      bids,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/*
  - Get bids for a specific user (admin only).
  - Endpoint: GET /bids/user/:userId
  - Query: ?userRole=farmer|buyer optional
*/
exports.getBidsForUserById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const userId = req.params.userId;
    const userRole = (req.query.userRole || "").toLowerCase();

    const filter = {};
    if (userRole === "farmer") filter.farmerId = userId;
    else if (userRole === "buyer") filter.buyerId = userId;
    else filter.$or = [{ farmerId: userId }, { buyerId: userId }];

    if (req.query.status) {
      const statuses = req.query.status.split(",").map((s) => s.trim());
      filter.status = { $in: statuses };
    }
    if (req.query.productId) filter.productId = req.query.productId;
    if (req.query.negotiationId) filter.negotiationId = req.query.negotiationId;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "-createdAt";

    const [total, bids] = await Promise.all([
      Bid.countDocuments(filter),
      Bid.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("productId", "name price farmerId isBiddable")
        .populate("buyerId", "firstName lastName email")
        .populate("farmerId", "firstName lastName email")
        .lean(),
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      bids,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
