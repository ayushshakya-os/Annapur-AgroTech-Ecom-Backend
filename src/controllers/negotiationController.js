const Negotiation = require("../models/Negotiation");
const Product = require("../models/product");

const startNegotiation = async (req, res) => {
  try {
    const { productId } = req.body;
    const buyerId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if farmerId exists
    if (!product.farmerId) {
      return res.status(400).json({ message: "This product is missing farmer info and cannot be negotiated" });
    }

    const negotiation = new Negotiation({
      productId,
      buyerId,
      farmerId: product.farmerId,
      initialPrice: product.price,
    });

    await negotiation.save();

    res.status(201).json(negotiation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const acceptNegotiation = async (req, res) => {
  try {
    const negotiation = req.negotiation;
    negotiation.status = "accepted";
    negotiation.agreedPrice = req.body.amount || null;
    await negotiation.save();

    req.io.to(negotiation._id.toString()).emit("negotiationClosed", {
      negotiationId: negotiation._id,
      status: negotiation.status,
      agreedPrice: negotiation.agreedPrice,
    });

    res.json({ message: "Negotiation accepted", negotiation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectNegotiation = async (req, res) => {
  try {
    const negotiation = req.negotiation;
    negotiation.status = "rejected";
    await negotiation.save();

    req.io.to(negotiation._id.toString()).emit("negotiationClosed", {
      negotiationId: negotiation._id,
      status: negotiation.status,
    });

    res.json({ message: "Negotiation rejected", negotiation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFarmerNegotiations = async (req, res) => {
  try {
    const negotiations = await Negotiation.find({ farmerId: req.user._id })
      .populate("productId")
      .populate("buyerId");
    res.json(negotiations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  startNegotiation,
  acceptNegotiation,
  rejectNegotiation,
  getFarmerNegotiations,
};
