const Bid = require("../models/Bid");
const Negotiation = require("../models/Negotiation");

const placeBid = async (req, res) => {
  try {
    const { negotiationId, amount } = req.body;
    const userId = req.user._id;
    const role = req.user.role;

    const negotiation = await Negotiation.findById(negotiationId);
    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });
    if (negotiation.status !== "ongoing") return res.status(400).json({ message: "Negotiation is closed" });

    const bid = new Bid({ negotiationId, userId, role, amount });
    await bid.save();

    req.io.to(negotiationId.toString()).emit("newBid", {
      _id: bid._id,
      user: req.user.fullName || req.user.email,
      role,
      amount,
      timestamp: bid.createdAt,
    });

    res.status(201).json({ message: "Bid placed", bid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBids = async (req, res) => {
  try {
    const bids = await Bid.find({ negotiationId: req.params.negotiationId })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName email");
    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { placeBid, getBids };
