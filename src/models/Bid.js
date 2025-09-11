const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    negotiationId: { type: mongoose.Schema.Types.ObjectId, ref: "Negotiation", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["buyer", "farmer"], required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bid", bidSchema);
