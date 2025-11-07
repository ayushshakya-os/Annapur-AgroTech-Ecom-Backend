const mongoose = require("mongoose");
const Cart = require("../models/cart");
const Product = require("../models/Product");

// GET /api/cart/:userId
exports.getCart = async (req, res) => {
  try {
    const { userId } = req.params;
    let cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).populate("items.productId");

    if (!cart) {
      cart = await Cart.create({
        userId: new mongoose.Types.ObjectId(userId),
        items: [],
      });
    }

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/cart/:userId/add
// body: { productId, quantity }
exports.addToCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });

    let cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!cart) {
      cart = new Cart({
        userId: new mongoose.Types.ObjectId(userId),
        items: [],
      });
    }

    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId
    );
    if (idx > -1) {
      cart.items[idx].quantity += quantity;
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        category: product.category,
        quantity,
      });
    }

    await cart.save();
    const populated = await cart.populate("items.productId");

    res.json({ success: true, message: "Item added to cart", cart: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/cart/:userId/update/:productId
// body: { quantity }
exports.updateCartItem = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res
        .status(400)
        .json({ success: false, error: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!cart)
      return res.status(404).json({ success: false, error: "Cart not found" });

    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId
    );
    if (idx === -1)
      return res
        .status(404)
        .json({ success: false, error: "Item not found in cart" });

    cart.items[idx].quantity = quantity;
    await cart.save();
    const populated = await cart.populate("items.productId");

    res.json({ success: true, message: "Cart item updated", cart: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/cart/:userId/remove/:productId
exports.removeFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!cart)
      return res.status(404).json({ success: false, error: "Cart not found" });

    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    if (cart.items.length === before) {
      return res
        .status(404)
        .json({ success: false, error: "Item not found in cart" });
    }

    await cart.save();
    const populated = await cart.populate("items.productId");
    res.json({
      success: true,
      message: "Item removed from cart",
      cart: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/cart/:userId/clear
exports.clearCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!cart)
      return res.status(404).json({ success: false, error: "Cart not found" });

    cart.items = [];
    await cart.save();
    res.json({ success: true, message: "Cart cleared", cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
