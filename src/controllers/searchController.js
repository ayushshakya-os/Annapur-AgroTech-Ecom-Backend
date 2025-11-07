const Product = require("../models/Product");
const Search = require("../models/Search");

exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res
        .status(400)
        .json({ success: false, error: "Query is required" });
    }
    const results = await Product.find({
      name: { $regex: query, $options: "i" },
    });

    // Save query in search history
    if (req.user && req.user._id && req.user.role !== "guest") {
      await Search.create({ user: req.user._id, query });
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all searches by the logged-in user
exports.getUserSearches = async (req, res, next) => {
  try {
    const searches = await Search.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, searches });
  } catch (error) {
    next(error);
  }
};

// Optional: Clear search history
exports.clearSearchHistory = async (req, res, next) => {
  try {
    await Search.deleteMany({ user: req.user.id });
    res.json({ success: true, message: "Search history cleared" });
  } catch (error) {
    next(error);
  }
};
