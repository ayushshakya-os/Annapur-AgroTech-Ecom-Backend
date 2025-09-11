
const Product = require("../models/product");
const Search = require("../models/Search");

// GET /api/products
exports.getAllProducts = async (req, res) => {
  try {

    const { query, category, minPrice, maxPrice } = req.query;

    let filter = {};
    
    if(query){
        filter.name = { $regex: query, $options: "i"};
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
    if (!product){
      return res.status(404).json({ success: false, message: "Product not found" });
}
    res.json({ success: true, product });
  } catch (error) {
    if(error.name === 'CastError'){
        return res.status(400).json({
            success: false,
            message: "Invalid product ID format"
        });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/products (admin)
exports.addProduct = async (req, res) => {
  try {
    if(!req.user || !["farmer", "admin"].includes(req.user.role)){
        return res
        .status(403)
        .json({success: false, message: "Only farmers can add products"});
    }
    const { name, image, price, short_description, description, category } = req.body;
    const product = await Product.create({
      name,
      image,
      price,
      short_description,
      description,
      category,
      farmerId : req.user._id,
    });
    res.status(201).json({ success: true, message: "Product added", product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/products/:id (admin)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Only admin or the farmer who owns the product can update it
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

    // Only admin or the farmer who owns the product can delete it
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
