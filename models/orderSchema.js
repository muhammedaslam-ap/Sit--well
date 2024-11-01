const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addressType: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    landMark: {
        type: String
    },
    state: {
        type: String,
        required: true
    },
    pinCode: {
        type: String,
        required: true
    },
    addressLine1: {
        type: String,
        required: true
    },
    district: {
        type: String
    },
    phone: {
        type: String,
        required: true
    },
    altPhone: {
        type: String
    }
});

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        productImage: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            required: false,
            enum: ['Pending', 'Delivered', 'Processing', 'Shipped', 'Cancelled', 'Return Request', 'Returned']
        },
    }],
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    finalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    address: {
        type: [addressSchema],
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending',  'Processing', 'Shipped','Delivered', 'Cancelled', 'Return Request', 'Returned']
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        },
    couponApplied: {
        type: Boolean,
        default: false
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;