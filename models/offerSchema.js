const mongoose = require('mongoose');
const { Schema } = mongoose;

const OfferSchema = new Schema({
    offerType: {
        type: String,
        required: true,
        enum: ['product', 'category'],
        trim: true,
    },
    productName: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: function () {
            return this.offerType === 'product';
        },
    },
    categoryName: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: function () {
            return this.offerType === 'category';
        },
    },
    offerDescription: {
        type: String,
        trim: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: [0, 'Discount percentage cannot be negative'],
        max: [80, 'Discount percentage cannot exceed 80'], // Adjusted for stricter validation
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
   
}, {
    timestamps: true,
});

OfferSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });

OfferSchema.pre('save', function (next) {
    if (this.endDate <= new Date()) {
        return next(new Error('The endDate must be in the future.'));
    }
    next();
});

const Offer = mongoose.model('Offer', OfferSchema);
module.exports = Offer;
