const mongoose = require('mongoose')
const Cart = require('../models/cartSchema')
const Address = require('../models/addressSchema');
const Order = require('../models/orderSchema');
const Product  = require('../models/productSchema')
const Coupon = require('../models/couponSchema')
const Wallet = require('../models/walletSchema')
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
        // console.log(sessiocoupon)
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
        req.session.paypalDetails = false;

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
        const { selectedAddress, selectedPayment } =  req.session.paypalDetails ?    req.session.paypalDetails : req.body;

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


        const userCart = await Cart.findOne({ userId }).populate('items.productId');
        if (!userCart || userCart.items.length === 0) {
            req.flash('error', 'Your cart is empty. Please add items before proceeding to payment.');
            return res.redirect('/checkout');
        }

        for (let item of userCart.items) {
            const product = await Product.findById(item.productId._id);

            if (!product || item.quantity > product.quantity) {
                req.flash('error', `Not enough stock for ${product ? product.productName : 'a product'}. Available: ${product ? product.quantity : 0}`);
                return res.redirect('/checkout'); 
            }
        }


        if (!userAddress) {
            req.flash('error', 'Invalid address selected.');
            return res.redirect('/checkout');
        }

        if (!userCart || userCart.items.length === 0) {
            req.flash('error', 'No items found in cart.');
            return res.redirect('/checkout');
        }

        const totalPrice = userCart.items.reduce((total, item) => total + item.price * item.quantity, 0);

        let isCoupon = false;
        let newPrice = 0
        let discount = 0;
        const sessiocoupon = req.session.coupon;
        // console.log(sessiocoupon)
        if (sessiocoupon) {
            isCoupon = true
            const validCoupon = await Coupon.findOne({ couponCode: sessiocoupon.couponCode, islist: true });
            if (validCoupon) {
                discount = (totalPrice * validCoupon.discount) / 100;
                newPrice = totalPrice - discount;
            }
        } else {
            console.log('No coupons applied');
        }



        const selectedAddressDetails = userAddress.address.find(addr => addr._id.toString() === selectedAddress);
        // console.log("Selected Address Details:", selectedAddressDetails);

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
            totalPrice:totalPrice,
            finalAmount:newPrice,
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

        // console.log(newOrder.totalPrice,'this want you want to see')
        // console.log(newOrder.finalAmount,'this want you want to see')


        
        // console.log("New Order to Save:", newOrder); 
        req.session.newOrder = newOrder
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
            .populate('userId', 'name email phone') 
            .populate('orderedItems.product', 'productName price productImages')
            .sort({createdOn:-1})
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

        // console.log("Updating Order ID:", orderId);
        // console.log("New Status:", status);

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

        if ( order.status === 'Delivered') {
            req.flash('error', 'Order cannot be Cancelled after it has been shipped or delivered.');
            return res.redirect('/order');
        }
        if (order.status === 'Returned') {
            req.flash('error', 'This order has already been return by user');
            return res.redirect('/admin/orderDetails');
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

        // Filter orders by userId and search query
        const searchQuery = {
            userId: userId,
            $or: [
                { orderId: { $regex: ".*" + search + ".*", $options: 'i' } },
                { "orderedItems.product.productName": { $regex: ".*" + search + ".*", $options: 'i' } }
            ]
        };

        // Fetch orders with pagination
        const orders = await Order.find(searchQuery)
            .populate('userId', 'name email phone')
            .populate('orderedItems.product', 'productName price productImages')
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        // Count total orders matching the query
        const totalOrders = await Order.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalOrders / limit);

        // If no orders found, render the page with a "No orders found" message
        if (!orders || orders.length === 0) {
            return res.render('userOrder', { 
                orders: [],
                statusOptions: [],
                userId,
                currentPage: page,
                totalPages: 0,
                search,
                message: 'No orders found for this user.'
            });
        }

        // Get status options from the Order schema
        const statusOptions = Order.schema.path('status').enumValues;

        // Render the order view
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
    
        
        if (order.status === 'Delivered') {
            order.status = 'Return Request';  
            req.flash('success', 'Your return request has been successfully processed.');
        } else {
            order.status = 'Cancelled'; 
            req.flash('success', 'Order has been successfully cancelled.');
        }
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            console.error("Wallet not found for the user.");
            return;
        }
        
        let amountToCredit;
        if (order.finalAmount > 0) {
            amountToCredit = order.finalAmount;
        } else if (order.totalPrice && order.finalAmount === 0) {
            amountToCredit = order.totalPrice;
        } else {
            console.error("No amount to credit.");
            return;
        }

        if (order.paymentMethod === 'cash' || order.status === 'Return Request') {
            console.log("Cash on delivery order: No amount to credit.");
        } else {
            const newBalance = wallet.balance + amountToCredit;
            await Wallet.updateOne(
                { user: userId },
                {
                    $set: { balance: newBalance },
                    $push: {
                        transactions: {
                            transaction_date: Date.now(),
                            transaction_type: "Credit",
                            transaction_status: "Completed",
                            amount: amountToCredit
                        }
                    }
                }
            );
        }
        
        
       
    
        const productUpdatePromises = order.orderedItems.map(async (orderItem) => {
            if(order.status !== 'Return Request'){
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

const returnMessage = async (req, res) => {
    try {
        const { orderId } = req.params; 
        const { reason} = req.body; 

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'Return message is required.' });
        }
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        order.returnRequest = reason;

        order

        if (order.status === 'Delivered') {
            order.status = 'Return Request';  
            req.flash('success', 'Your return request has been successfully processed.');
        } 

        await order.save();

        req.flash('success', 'Return request submitted successfully.');
        res.redirect('/order')

        
    } catch (error) {
        console.error('Error handling return message:', error);

        return res.status(500).json({ error: 'Internal server error.' });
    }
};



const approveReturnRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log("Processing return approval for orderId:", orderId);

        const order = await Order.findById(orderId).populate({
            path: 'orderedItems.product',
        });

        if (!order || order.status !== 'Return Request') {
            console.error("Invalid order or no return request found. OrderId:", orderId);
            req.flash('error', 'Invalid order or no return request found.');
            return res.redirect('/admin/orderDetails');
        }

        order.status = 'Returned';

        const wallet = await Wallet.findOne({ user: order.userId });
            const amountToCredit = order.finalAmount || order.totalPrice || 0;
            if (amountToCredit > 0) {
                wallet.balance += amountToCredit;
                wallet.transactions.push({
                    transaction_date: Date.now(),
                    transaction_type: "Credit",
                    transaction_status: "Completed",
                    amount: amountToCredit,
                });
                await wallet.save();
                console.log(`Credited ${amountToCredit} to wallet of user ${order.userId}`);            
        }

        await Promise.all(order.orderedItems.map(async (orderItem) => {
            if (orderItem.product && orderItem.quantity) {
                try {
                    const product = await Product.findById(orderItem.product._id);
                    if (product) {
                        product.quantity += orderItem.quantity;
                        await product.save();
                        console.log(`Restored stock for product ID: ${product._id}`);
                    } else {
                        console.error(`Product not found for ID: ${orderItem.product._id}`);
                    }
                } catch (error) {
                    console.error(`Error updating stock for product ID: ${orderItem.product._id}`, error);
                }
            }
        }));

        await order.save();

        req.flash('success', 'The return request has been approved and processed.');
        return res.redirect('/admin/orderDetails');
    } catch (error) {
        console.error("Error approving return request:", error);
        req.flash('error', 'An error occurred while approving the return request.');
        return res.redirect('/admin/orderDetails');
    }
};


const cancelReturnRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId);

        if (!order) {
            req.flash('error', 'Order not found.');
            return res.redirect('/admin/orderDetails');
        }

        if (order.status !== 'Return Request') {
            req.flash('info', 'Order is already delivered. No return request to cancel.');
            return res.redirect('/admin/orderDetails');
        }
        order.status = 'Delivered';
        order.rejectionMessage = "Sorry, admin rejected your return request.";
        await order.save();

        req.flash('success', 'The return request has been cancelled. Admin apologizes for the inconvenience.');
        return res.redirect('/admin/orderDetails');
    } catch (error) {
        console.error('Error canceling the return request:', error);
        req.flash('error', 'An error occurred while canceling the return request.');
        return res.redirect('/admin/orderDetails');
    }
};











module.exports={
    getOrderSuccess,
    proceedTopayment,
    getOrderDetails,
    updateOrderStatus,
    getYourOrder,
    orderCancelorRturn,
    retrieveOrderDetails,
    approveReturnRequest,
    cancelReturnRequest,
    returnMessage
}