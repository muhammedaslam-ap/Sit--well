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
        validate: {
            validator: async function(value) {
                if (this.offerType === 'product') {
                    const Product = mongoose.model('Product');
                    const product = await Product.findById(value);
                    return product !== null;
                }
                return true;
            },
            message: 'Selected product does not exist'
        }
    },
    categoryName: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: function() {
            return this.offerType === 'category';
        },
        validate: {
            validator: async function(value) {
                if (this.offerType === 'category') {
                    const Category = mongoose.model('Category');
                    const category = await Category.findById(value);
                    return category !== null;
                }
                return true;
            },
            message: 'Selected category does not exist'
        }
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
        validate: {
            validator: function(value) {
                return value <= this.endDate;
            },
            message: 'Start date must be before or equal to end date'
        }
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value >= this.startDate;
            },
            message: 'End date must be after or equal to start date'
        }
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


OfferSchema.pre('save', async function(next) {
    if (this.isModified('discountPercentage') || this.isNew) {
        const Product = mongoose.model('Product');
        try {
            if (this.offerType === 'product' && this.productName) {
                const product = await Product.findById(this.productName);
                if (!product) {
                    throw new Error('Product not found');
                }
                
                const discountedPrice = product.regularPrice * (1 - this.discountPercentage / 100);
                await Product.findByIdAndUpdate(this.productName, {
                    productOffer: this.discountPercentage,
                    salePrice: discountedPrice
                });
            } 
            else if (this.offerType === 'category' && this.categoryName) {
                const products = await Product.find({ category: this.categoryName });
                
                await Promise.all(products.map(product => {
                    const discountedPrice = product.regularPrice * (1 - this.discountPercentage / 100);
                    return Product.findByIdAndUpdate(product._id, {
                        categoryOffer: this.discountPercentage,
                        salePrice: discountedPrice
                    });
                }));
            }
        } catch (error) {
            next(error);
            return;
        }
    }
    next();
});

OfferSchema.post('remove', async function(doc) {
    const Product = mongoose.model('Product');
    try {
        if (doc.offerType === 'product') {
            await Product.findByIdAndUpdate(doc.productName, {
                productOffer: 0,
                salePrice: null
            });
        } else if (doc.offerType === 'category') {
            await Product.updateMany(
                { category: doc.categoryName },
                {
                    categoryOffer: 0,
                    salePrice: null
                }
            );
        }
    } catch (error) {
        console.error('Error resetting prices after offer removal:', error);
    }
});

OfferSchema.index({ offerType: 1, status: 1 });

const Offer = mongoose.model('Offer', OfferSchema);
module.exports = Offer;