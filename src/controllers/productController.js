
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
    const { name, image, price, short_description, description, category } = req.body;
    const product = await Product.create({
      name,
      image,
      price,
      short_description,
      description,
      category,
    });
    res.status(201).json({ success: true, message: "Product added", product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/products/:id (admin)
exports.updateProduct = async (req, res) => {
  try {
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!product)
      return res.status(404).json({ success: false, error: "Product not found" });
    res.json({ success: true, message: "Product updated", product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/products/:id (admin)
exports.removeProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, error: "Product not found" });
    res.json({ success: true, message: "Product removed", productId: product._id, name: product.name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
