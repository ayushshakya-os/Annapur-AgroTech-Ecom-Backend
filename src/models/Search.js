const mongoose = require("mongoose");

const searchSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        query: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["product"],
            default: "product",
        },
    },
        { timestamps: true}
);
module.exports = mongoose.model("Search", searchSchema);