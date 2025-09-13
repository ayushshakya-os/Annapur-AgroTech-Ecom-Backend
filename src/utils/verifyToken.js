const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (token) => {
  if (!token) throw new Error("No token provided");

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) throw new Error("User not found");

  return user;
};

module.exports = verifyToken;
