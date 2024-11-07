const mongoose = require('mongoose')
const Cart = require('../models/cartSchema')
const Address = require('../models/addressSchema');
const Order = require('../models/orderSchema');
const Product  = require('../models/productSchema')
const Coupon = require('../models/couponSchema')
const User = require('../models/userSchema')


const getOrderSuccess = async (req, res) => {
    try {
        const userId = req.session.user._id; 

        if (!userId) {
            req.flash('error', 'User data not found');
            return res.redirect('/checkout');
        }

        // Retrieve the latest order details
        const orderDetails = await Order.findOne({ userId })
            .sort({ createdOn: -1 })
            .populate('orderedItems.product')
            .exec(); 

        if (!orderDetails) {
            req.flash('error', 'Order details not found');
            return res.redirect('/checkout'); 
        }

        // Retrieve user cart and address details
        const userCart = await Cart.findOne({ userId }).populate('items.productId');
        const userAddress = await Address.findOne({ userId }); // Fetch the user's address

        if (!userAddress) {
            req.flash('error', 'Invalid address selected.');
            return res.redirect('/checkout');
        }

        if (!userCart || userCart.items.length === 0) {
            req.flash('error', 'No items found in cart.');
            return res.redirect('/checkout');
        }

        // Calculate the total price of items in the cart
        const totalPrice = userCart.items.reduce((total, item) => total + item.price * item.quantity, 0);
        const finalAmount = totalPrice;

        let isCoupon = false;

        let discount = 0;
        const sessiocoupon = req.session.coupon;
        console.log(sessiocoupon)
        if (sessiocoupon) {
            isCoupon = true
            const validCoupon = await Coupon.findOne({ couponCode: sessiocoupon.couponCode, islist: true });
            if (validCoupon) {
                discount = (finalAmount * validCoupon.discount) / 100;
            }
        } else {
            console.log('No coupons applied');
        }

        const newPrice = finalAmount - discount;

        await Cart.deleteOne({ userId });
        
        req.session.coupon = null;

        return res.render('orderSuccess', {
            orderDetails: orderDetails,
            userId: userId,
            newPrice,
            isCoupon,
            userAddress 
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

        // console.log("User ID:", userId);
        // console.log("Selected Address ID:", selectedAddress);
        // console.log("Selected Payment:", selectedPayment);

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

        for (const item of cartItems) {
            await Product.updateOne(
                { _id: item.product },
                { $inc: { quantity: -item.quantity } }
            );
        }

        req.flash('success', 'Successfully ordered product');
        return res.redirect('/orderSuccess');

    } catch (error) {
        console.error('Error while proceeding to payment:', error);
        req.flash('error', 'There was an error processing your payment. Please try again.');
        return res.redirect('/checkout');
    }
};


const getOrderDetails = async (req, res) => {
    try {
        const search = req.query.search || ""; 
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 3; 
  
       
        
        const orders = await Order.find({
            $or: [
                { orderId: { $regex: ".*" + search + ".*", $options: 'i' } },
                { productName: { $regex: ".*" + search + ".*", $options: 'i' } }
            ]
        })
            .populate('userId', ' name email phone') 
            .populate('orderedItems.product', 'productName price productImages')
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();


            const totalOrders = await Order.countDocuments({
                $or: [
                    { orderId: { $regex: ".*" + search + ".*", $options: 'i' } },
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } }
                ]
            });
            const totalPages = Math.ceil(totalOrders / limit);

        if (!orders) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orderDetails');
        }

        const statusOptions = Order.schema.path('status').enumValues;



        return res.render('admin_orderDetails', { 
            orders,
            statusOptions,      
            currentPage: page,
            totalPages, 
            search
         });
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.redirect('/admin/pageerror');
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        console.log("Updating Order ID:", orderId);
        console.log("New Status:", status);

        const order = await Order.findById(orderId).populate({
            path: 'orderedItems.product' 
        });

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orderDetails');
        }

        if (order.status === 'Cancelled') {
            req.flash('error', 'This order has already been cancelled');
            return res.redirect('/admin/orderDetails');
        }

        if (order.status === 'Shipped' || order.status === 'Delivered') {
            req.flash('error', 'Order cannot be Cancelled after it has been shipped or delivered.');
            return res.redirect('/order');
        }

        const isBecomingCancelled = status === 'Cancelled';

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            console.error("Order not found during update");
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orderDetails');
        }

        if (isBecomingCancelled) {
            console.log(`Order ${orderId} is being cancelled. Restoring product quantities...`);

            const productUpdatePromises = order.orderedItems.map(async (orderItem) => {
                if (orderItem.product && orderItem.quantity) {
                    try {
                        const product = await Product.findById(orderItem.product._id);
                        
                        if (product) {
                            product.quantity += orderItem.quantity;
                            
                            await product.save();

                            console.log(`Restored ${orderItem.quantity} units of product ${product.productName}`);
                        } else {
                            console.error(`Product not found for ID: ${orderItem.product._id}`);
                        }
                    } catch (quantityUpdateError) {
                        console.error(`Failed to update quantity for product ${orderItem.product._id}:`, quantityUpdateError);
                    }
                }
            });

            await Promise.all(productUpdatePromises);
        }

        req.flash('success', 'Order status updated successfully');
        return res.redirect('/admin/orderDetails');

    } catch (error) {
        console.error("Error updating order status:", error);
        req.flash('error', 'Failed to update order status');
        return res.redirect('/admin/orderDetails');
    }
};


const getYourOrder = async (req, res) => {
    try {

        const search = req.query.search || ""; 
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 3; 
        const userId = req.session.user._id;

        const orders = await Order.find({ userId: userId,
            $or: [
                { orderId: { $regex: ".*" + search + ".*", $options: 'i' } },
                { productName: { $regex: ".*" + search + ".*", $options: 'i' } }
                ]
         })
      
            .populate('userId', 'name email phone')
            .populate('orderedItems.product', 'productName price productImages')
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

         
            const totalOrders = await Order.countDocuments({
                $or: [
                    { orderId: { $regex: ".*" + search + ".*", $options: 'i' } },
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } }
                ]
            });
            const totalPages = Math.ceil(totalOrders / limit);

        if (!orders || orders.length === 0) {
            req.flash('error', 'No orders found for this user');
            return res.redirect('/');
        }

        const statusOptions = Order.schema.path('status').enumValues;

        return res.render('userOrder', { 
            orders,
            statusOptions,      
            userId,
            currentPage: page,
            totalPages, 
            search
        });
        
    } catch (error) {
        console.error('Error fetching user orders:', error);
        req.flash('error', 'An error occurred while fetching orders');
        return res.redirect('/'); 
    }
};

const retrieveOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const orderId = req.params.orderId; 
        const orderDetails = await Order.findOne({ userId, _id: orderId })
            .populate('orderedItems.product')
            .exec();

        if (!orderDetails) {
            return res.status(404).json({ error: 'Order details not found.' });
        }

        res.json(orderDetails); 

    } catch (error) {
        console.error('Error retrieving order details:', error);
        res.status(500).json({ error: 'Error loading order details.' });
    }
};



const orderCancelorRturn = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const orderId = req.params.orderId;
    
        const order = await Order.findOne({ _id: orderId, userId }).populate({
            path: 'orderedItems.product',
        });
    
        if (!order) {
            console.error(`Order not found or access denied. Order ID: ${orderId}, User ID: ${userId}`);
            req.flash('error', 'Order not found or you don’t have permission to modify this order.');
            return res.redirect('/order');
        }
    
        if (order.status === 'Cancelled') {
            req.flash('error', 'This order has already been cancelled and cannot be modified.');
            return res.redirect('/order');
        }
    
        
        if (order.status === 'Shipped' || order.status === 'Delivered') {
            order.status = 'Returned';  
            req.flash('success', 'Your return request has been successfully processed.');
        } else {
            order.status = 'Cancelled'; 
            req.flash('success', 'Order has been successfully cancelled.');
        }
    
        // Restore stock quantities for each product in the returned/cancelled order
        const productUpdatePromises = order.orderedItems.map(async (orderItem) => {
            if (orderItem.product && orderItem.quantity) {
                try {
                    const product = await Product.findById(orderItem.product._id);
                    if (product) {
                        product.quantity += orderItem.quantity;
                        await product.save();
                        console.log(`Restored ${orderItem.quantity} units of product ${product.productName}`);
                    } else {
                        console.error(`Product not found for ID: ${orderItem.product._id}`);
                    }
                } catch (quantityUpdateError) {
                    console.error(`Failed to update quantity for product ${orderItem.product._id}:`, quantityUpdateError);
                }
            }
        });
    
        await Promise.all(productUpdatePromises);
    
        await order.save();
    
        return res.redirect('/order');
    
    } catch (error) {
        console.error("Error processing order status change:", error);
        req.flash('error', 'An error occurred while attempting to process your request.');
        return res.redirect('/order');
    }
    
};









module.exports={
    getOrderSuccess,
    proceedTopayment,
    getOrderDetails,
    updateOrderStatus,
    getYourOrder,
    orderCancelorRturn,
    retrieveOrderDetails
}