const mongoose = require('mongoose');
const { Schema } = mongoose;

const OfferSchema = new Schema({
    offerType: {
        type: String,
        required: true,
        enum: ['product', 'category'],
        trim: true
    },
    productName: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: function() {
            return this.offerType === 'product';
        },
        
    },
    categoryName: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: function() {
            return this.offerType === 'category';
        },
       
    },
    offerDescription: {
        type: String,
        required: false,
        trim: true
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100']
    },
    startDate: {
        type: Date,
        required: true,
        
    },
    endDate: {
        type: Date,
        required: true,
        
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'upcoming'],
        default: function() {
            const now = new Date();
            if (now < this.startDate) return 'upcoming';
            if (now > this.endDate) return 'expired';
            return 'active';
        }
    }
}, {
    timestamps: true
});



const Offer = mongoose.model('Offer', OfferSchema);
module.exports = Offer;