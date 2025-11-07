const Negotiation = require("../models/Negotiation");
const Product = require("../models/Product");

// Create a negotiation
exports.createNegotiation = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, msg: "ProductId is required" });
    }

    // Load product
    const product = await Product.findById(productId);
    if (!product || !product.isBiddable) {
      return res
        .status(400)
        .json({ success: false, msg: "Product not available for negotiation" });
    }

    // Check if negotiation already exists
    let negotiation = await Negotiation.findOne({
      productId,
      buyerId: req.user._id,
      farmerId: product.farmerId,
      status: "active",
    });

    if (negotiation) {
      return res.status(200).json({
        success: true,
        negotiation,
        msg: "Existing negotiation found",
      });
    }

    // Otherwise create new one
    negotiation = new Negotiation({
      productId,
      buyerId: req.user._id,
      farmerId: product.farmerId,
      status: "active",
    });

    await negotiation.save();
    res.status(201).json({ success: true, negotiation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
