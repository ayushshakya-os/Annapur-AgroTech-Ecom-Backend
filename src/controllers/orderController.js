const mongoose = require("mongoose");
const Order = require("../models/order");
const Cart = require("../models/cart");

// Helper order id (fallback if pre-save missing)
const generateOrderId = () =>
  "ORD" + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase();

// POST /api/orders/:userId/create
exports.createOrder = async (req, res) => {
  try {
    const { userId } = req.params;
    const { customer, shippingAddress, paymentMethod } = req.body;

    if (!customer || !shippingAddress) {
      return res.status(400).json({
        success: false,
        error: "Customer and shippingAddress required",
      });
    }

    const cart = await Cart.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    // Calculate from cart (server-authoritative)
    const subtotal = cart.items.reduce(
      (s, it) => s + it.price * it.quantity,
      0
    );
    const shipping = subtotal >= 1000 ? 0 : 50;
    const tax = subtotal * 0.1;
    const total = subtotal + shipping + tax;

    const orderItems = cart.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      image: it.image,
      price: it.price,
      category: it.category,
      quantity: it.quantity,
      itemTotal: it.price * it.quantity,
    }));

    const order = new Order({
      orderId: generateOrderId(),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      subtotal,
      shipping,
      tax,
      total,
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
      shippingAddress: {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
      },
      paymentMethod,
      paymentStatus:
        paymentMethod === "cod"
          ? "pending"
          : paymentMethod === "esewa"
          ? "pending"
          : "completed",
      status: "pending",
    });

    await order.save();

    // Empty cart
    cart.items = [];
    await cart.save();

    res.status(201).json({ success: true, message: "Order created", order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/orders/user/:userId
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/orders/:orderId
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId }).populate("items.productId");
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/orders/:orderId/status (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const valid = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, error: "Invalid status" });

    const order = await Order.findOneAndUpdate(
      { orderId },
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    res.json({ success: true, message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email")
      .populate("items.productId");
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
