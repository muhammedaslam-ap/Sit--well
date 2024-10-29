const mongoose = require('mongoose')
const Cart = require('../models/cartSchema')
const Address = require('../models/addressSchema');
const Order = require('../models/orderSchema');


const getOrderSuccess = async (req, res) => {
    try {
        const userId = req.session.user._id; 

        if (!userId) {
            req.flash('error', 'User data not found');
            return res.redirect('/checkout');
        }

        const orderDetails = await Order.findOne({ userId }).sort({ createdOn: -1 }).populate('orderedItems.product') 
        .exec(); // Get the latest order

        if (!orderDetails) {
            req.flash('error', 'Order details not found');
            return res.redirect('/checkout'); 
        }

        await Cart.deleteOne({ userId });
        console.log("Cart cleared successfully");

        return res.render('orderSuccess', {
            orderDetails: orderDetails,
            userId: userId
        });

    } catch (error) {
        console.error('Error found while retrieving order details:', error);
        return res.redirect('/pageNotFound'); 
    }
};


const proceedTopayment = async (req, res) => {
    try {
        const userId = req.session.user._id; 
        const { selectedAddress, selectedPayment } = req.body;

        console.log("User ID:", userId);
        console.log("Selected Address ID:", selectedAddress);
        console.log("Selected Payment:", selectedPayment);

        if (!selectedAddress || !selectedPayment) {
            req.flash('error', 'Please select an address and a payment method.');
            return res.redirect('/checkout');
        }

        const userAddress = await Address.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            "address._id": new mongoose.Types.ObjectId(selectedAddress)
        });

        console.log("User Address Found:", userAddress);

        const userCart = await Cart.findOne({ userId }).populate('items.productId');
        console.log("User Cart Found:", userCart);

        if (!userAddress) {
            req.flash('error', 'Invalid address selected.');
            return res.redirect('/checkout');
        }

        if (!userCart || userCart.items.length === 0) {
            req.flash('error', 'No items found in cart.');
            return res.redirect('/checkout');
        }

        const totalPrice = userCart.items.reduce((total, item) => total + item.price * item.quantity, 0);
        const finalAmount = totalPrice;

        const selectedAddressDetails = userAddress.address.find(addr => addr._id.toString() === selectedAddress);
        console.log("Selected Address Details:", selectedAddressDetails);

        if (!selectedAddressDetails) {
            req.flash('error', 'The selected address could not be found.');
            return res.redirect('/checkout');
        }

        const cartItems = userCart.items.map(item => {
            if (!item.productId) {
                throw new Error("Invalid cart item: product data is missing.");
            }
            return {
                product: item.productId._id,
                productName : item.productId.productName,
                quantity: item.quantity,
                price: item.price,
                productImage: item.productImages?.[0] || '',
            };
        });

        console.log("Cart Items Prepared for Order:", cartItems);

        const newOrder = new Order({
            userId,
            orderedItems: cartItems,
            totalPrice,
            finalAmount,
            address: [
                {
                    userId: userAddress.userId,
                    addressType: selectedAddressDetails.addressType,
                    name: selectedAddressDetails.name,
                    city: selectedAddressDetails.city,
                    landMark: selectedAddressDetails.landMark,
                    state: selectedAddressDetails.state,
                    pinCode: selectedAddressDetails.pinCode,
                    addressLine1: selectedAddressDetails.addressLine1,
                    district: selectedAddressDetails.district,
                    phone: selectedAddressDetails.phone,
                    altPhone: selectedAddressDetails.altPhone
                }
            ],
            paymentMethod: selectedPayment,
            status: 'Pending',
            createdOn: new Date()
        });

        console.log("New Order to Save:", newOrder); 

        await newOrder.save();

        req.flash('success', 'Successfully ordered product');
        return res.redirect('/orderSuccess');

    } catch (error) {
        console.error('Error while proceeding to payment:', error);
        req.flash('error', 'There was an error processing your payment. Please try again.');
        return res.redirect('/checkout');
    }
};





module.exports={
    getOrderSuccess,
    proceedTopayment
}