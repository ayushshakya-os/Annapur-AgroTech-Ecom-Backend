const mongoose = require("mongoose");
const Product = require("../models/Product");
const Search = require("../models/Search");

// Build a reusable filter from query params
function buildProductFilter(qs = {}) {
  const { query, category, minPrice, maxPrice, isBiddable } = qs;
  const filter = {};

  if (query) {
    filter.name = { $regex: query, $options: "i" };
  }
  if (category) {
    filter.category = category;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (typeof isBiddable !== "undefined") {
    // Accepts "true"/"false" (string) or boolean
    filter.isBiddable =
      typeof isBiddable === "string" ? isBiddable === "true" : !!isBiddable;
  }
  return filter;
}

const SORT_WHITELIST = {
  newest: "-createdAt",
  oldest: "createdAt",
  price_asc: "price",
  price_desc: "-price",
  name_asc: "name",
  name_desc: "-name",
};

// GET /api/products
exports.getAllProducts = async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;

    let filter = {};

    if (query) {
      filter.name = { $regex: query, $options: "i" };
    }
    if (category) {
      filter.category = category;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    if (query && req.user) {
      await Search.create({
        user: req.user.id,
        query,
        type: "product",
      });
    }

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/products (farmer/admin)
exports.addProduct = async (req, res) => {
  try {
    if (!req.user || !["farmer", "admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Only farmers can add products" });
    }
    const { name, image, price, short_description, description, category } =
      req.body;
    const product = await Product.create({
      name,
      image,
      price,
      short_description,
      description,
      category,
      farmerId: req.user._id,
    });
    res.status(201).json({ success: true, message: "Product added", product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/products/:id (farmer owner or admin)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (
      req.user.role !== "admin" &&
      product.farmerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    Object.assign(product, req.body);
    await product.save();

    res.json({ success: true, message: "Product updated", product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/products/:id (farmer owner or admin)
exports.removeProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (
      req.user.role !== "admin" &&
      product.farmerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this product",
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product removed",
      productId: product._id,
      name: product.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * NEW: GET /api/products/myproducts (farmer/admin)
 * Returns products created by the currently authenticated farmer/admin.
 * Supports query, category, minPrice, maxPrice, isBiddable, pagination and sort.
 */
exports.getMyProducts = async (req, res) => {
  try {
    if (!req.user || !["farmer", "admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const {
      page = 1,
      limit = 12,
      sort = "newest",
      query,
      category,
      minPrice,
      maxPrice,
      isBiddable,
    } = req.query;

    const filter = {
      farmerId: req.user._id,
      ...buildProductFilter({
        query,
        category,
        minPrice,
        maxPrice,
        isBiddable,
      }),
    };

    const sortBy = SORT_WHITELIST[sort] || "-createdAt";
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sortBy)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.json({
      success: true,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        sort: sortBy,
      },
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * NEW: GET /api/products/farmer/:farmerId (public)
 * Returns products for a given farmerId.
 * Supports query, category, minPrice, maxPrice, isBiddable, pagination and sort.
 */
exports.getProductsByFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid farmer ID format" });
    }

    const {
      page = 1,
      limit = 12,
      sort = "newest",
      query,
      category,
      minPrice,
      maxPrice,
      isBiddable,
    } = req.query;

    const filter = {
      farmerId,
      ...buildProductFilter({
        query,
        category,
        minPrice,
        maxPrice,
        isBiddable,
      }),
    };

    const sortBy = SORT_WHITELIST[sort] || "-createdAt";
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sortBy)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.json({
      success: true,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        sort: sortBy,
      },
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * OPTIONAL: GET /api/products/myproducts/stats (farmer/admin)
 * Aggregate quick stats for the current farmer's products.
 */
exports.getMyProductStats = async (req, res) => {
  try {
    if (!req.user || !["farmer", "admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const farmerId = new mongoose.Types.ObjectId(req.user._id);
    const [stats] = await Product.aggregate([
      { $match: { farmerId } },
      {
        $group: {
          _id: "$farmerId",
          total: { $sum: 1 },
          biddable: {
            $sum: { $cond: [{ $eq: ["$isBiddable", true] }, 1, 0] },
          },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    return res.json({
      success: true,
      stats: stats || {
        total: 0,
        biddable: 0,
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
