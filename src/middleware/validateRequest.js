
const { body, param, validationResult } = require("express-validator");

const PAYMENT_METHODS = ["cod", "card", "upi", "esewa"];

const validateAddress = [
  body("address").isString().trim().notEmpty().withMessage("Address is required"),
  body("city").isString().trim().notEmpty().withMessage("City is required"),
  body("state").isString().trim().notEmpty().withMessage("State is required"),
  body("label").optional().isString().trim(),
  body("isDefault").optional().isBoolean(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

// For updating an address (all fields optional but must be valid type if present)
const validateUpdateAddress = [
  body("address").optional().isString().trim(),
  body("city").optional().isString().trim(),
  body("state").optional().isString().trim(),
  body("label").optional().isString().trim(),
  body("isDefault").optional().isBoolean(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

// when creating order, we validate customer, address, and payment (items come from cart)
const validateCreateOrder = [
  param("userId").isMongoId().withMessage("Invalid user ID"),
  body("customer.fullName").isString().trim().notEmpty().withMessage("Customer full name is required"),
  body("customer.email").isEmail().withMessage("Valid customer email is required"),
  body("customer.phone").isString().trim().notEmpty().withMessage("Customer phone is required"),
  body("shippingAddress.address").isString().trim().notEmpty().withMessage("Address is required"),
  body("shippingAddress.city").isString().trim().notEmpty().withMessage("City is required"),
  body("shippingAddress.state").isString().trim().notEmpty().withMessage("State is required"),
  body("paymentMethod").isIn(PAYMENT_METHODS).withMessage("Invalid payment method"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

const validateRegister = [
  body("fullName").isString().trim().notEmpty().withMessage("Full name required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("phone").optional().isString(),
  body("password").isLength({ min: 6 }).withMessage("Password must be 6+ chars"),
  body("confirmPassword").custom((val, { req }) => {
    if (val !== req.body.password) throw new Error("Passwords do not match");
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

const validateLogin = [
  body("email").isEmail(),
  body("password").isString().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

const validateCartAdd = [
  param("userId").isMongoId(),
  body("productId").isMongoId().withMessage("Valid productId is required"),
  body("quantity").isInt({ min: 1, max: 50 }).withMessage("Quantity 1-50"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

const validateCartUpdate = [
  param("userId").isMongoId(),
  param("productId").isMongoId(),
  body("quantity").isInt({ min: 1, max: 50 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

   
// ✅ Bid validation: Place a bid
const validatePlaceBid = [
  body("productId").isMongoId().withMessage("Valid productId is required"),
  body("offeredPrice").isFloat({ gt: 0 }).withMessage("Offered price must be a positive number"),
  body("negotiationId").isString().trim().notEmpty().withMessage("Negotiation ID is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

// ✅ Bid validation: Counter a bid
const validateCounterBid = [
  body("offeredPrice").isFloat({ gt: 0 }).withMessage("Counter price must be a positive number"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

// ✅ Bid validation: Accept a bid
const validateAcceptBid = [
  param("id").isMongoId().withMessage("Valid bid ID is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

module.exports = {
  validateCreateOrder,
  validateRegister,
  validateLogin,
  validateCartAdd,
  validateCartUpdate,
  validateAddress,
  validateUpdateAddress,
  validatePlaceBid,
  validateCounterBid,
  validateAcceptBid
};
