const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authMiddleware, restrictTo } = require("../middleware/authMiddleware");

// public
router.get("/allproducts", productController.getAllProducts);
router.get("/product/:id", productController.getProductById);

// NEW: public route to view a farmer's products
router.get("/farmer/:farmerId", productController.getProductsByFarmer);

// NEW: authenticated farmer/admin can view their own products
router.get(
  "/myproducts",
  authMiddleware,
  restrictTo("farmer", "admin"),
  productController.getMyProducts
);

// OPTIONAL: stats for current farmer
router.get(
  "/myproducts/stats",
  authMiddleware,
  restrictTo("farmer", "admin"),
  productController.getMyProductStats
);

// farmer/admin
router.post(
  "/addproduct",
  authMiddleware,
  restrictTo("farmer", "admin"),
  productController.addProduct
);
router.put(
  "/:id",
  authMiddleware,
  restrictTo("farmer", "admin"),
  productController.updateProduct
);
router.delete(
  "/:id",
  authMiddleware,
  restrictTo("farmer", "admin"),
  productController.removeProduct
);

module.exports = router;
