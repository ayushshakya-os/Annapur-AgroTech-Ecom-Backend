const mongoose = require("mongoose");

const negotiationSchema = new mongoose.Schema(
  {
    productId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    farmerId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    buyerId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    initialPrice: {
        type: Number,
        required: true,
    },
    status: { 
        type: String,
        enum: ["pending", "accepted", "rejected", "ongoing"],
        default: "ongoing",
    },
  },
  { timestamps: true });

module.exports = mongoose.model("Negotiation", negotiationSchema);
