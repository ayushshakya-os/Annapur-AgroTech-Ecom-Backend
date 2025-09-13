const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../utils/verifyToken"); // ✅ Added

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.decode(token); // ✅ decode instead of verify for guest check

    // guests do not exist in DB
    if (decoded?.role === "guest") {
      req.user = { _id: decoded.id, role: "guest", email: decoded.email || null };
      return next();
    }

    // ✅ Use shared verifyToken helper for authenticated users
    const user = await verifyToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
};

const blockGuests = (req, res, next) => {
  if (req.user && req.user.role === "guest") {
    return res.status(403).json({ success: false, error: "Guests are not allowed for this action" });
  }
  next();
};

// helper; check that only negotiation participants (buyer/farmer) can act
const restrictToNegotiationParticipants = (getNegotiation) => async (req, res, next) => {
  try {
    const negotiation = await getNegotiation(req);
    if (!negotiation) return res.status(404).json({ success: false, error: "Negotiation not found" });

    const userId = String(req.user._id); // normalize logged-in user ID
    const buyerId = String(negotiation.buyerId); // normalize buyer ID from DB
    const farmerId = String(negotiation.farmerId); // normalize farmer ID from DB

    if (req.user.role !== "admin" && userId !== buyerId && userId !== farmerId) {
      console.log("User ID:", userId);
      console.log("Buyer ID:", buyerId);
      console.log("Farmer ID:", farmerId);
      return res.status(403).json({ success: false, error: "Not authorized for this negotiation" });
    }

    req.negotiation = negotiation; // attach negotiation for controller use
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { authMiddleware, restrictTo, blockGuests, restrictToNegotiationParticipants };
