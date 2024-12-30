const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        sparse: true, 
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        required: true,
    },
    offerPrice:{
        type: Number,
        default: 0,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    quantity: {
        type: Number,
        required: true, 
    },
    productImage: {
        type: [String], 
        required: true,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "out of stock", "Discontinued"],
        required: true,
        default: "Available",
    },
    popularity:{
        type:[String],
        required:false
    }
}, { timestamps: true });


productSchema.pre("save", function (next) {
    if (this.quantity === 0) {
        this.status = "out of stock";
    } else if (this.quantity > 0 && this.status !== "Discontinued") {
        this.status = "Available";
    }
    next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
