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

        const userAddress = await Address.findOne({ userId }); // Fetch the user's address

        if (!userAddress) {
            req.flash('error', 'Invalid address selected.');
            return res.redirect('/checkout');
        }


        const totalPrice = orderDetails.orderedItems.reduce((total,item) => total + item.price * item.quantity,0)
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
        } else if(finalAmount>0){
            discount = orderDetails.discount
            isCoupon = true
        }else {
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
        let { selectedAddress, selectedPayment,paymentStatus,orderId } =  req.session.paypalDetails ?    req.session.paypalDetails : req.body;

        if(selectedPayment==='cash'){
            paymentStatus = "success"
        }

        // console.log('hyhfygehsfchaesyfgianvyt4uiehvn5iuhy7t8we:',selectedPayment,paymentStatus);
        
        if(orderId) {
            if(paymentStatus == "failed") {
                return res.redirect('/orderSuccess');
            } else {
                const existingOrder = await Order.findOne({_id:orderId})
                if(existingOrder) {
                    await Order.updateOne(
                        {_id:orderId},
                        {paymentStatus:"success"}
                    )
                }

                return res.redirect('/orderSuccess');
            }
        } else {
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

        const totalAmount = newPrice > 0 ? newPrice : totalPrice;
        console.log('suii',totalAmount)

        if (selectedPayment === 'cash' && totalAmount > 20000) {
            req.flash('error', 'Cash on Delivery is only applicable for amounts less than 20,000.');
            return res.redirect('/checkout');
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

        console.log("Cart Items Prepared for Order:");

        const newOrder = new Order({
            userId,
            orderedItems: cartItems,
            totalPrice:totalPrice,
            discount:discount,
            couponApplied: sessiocoupon ? true : false,
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
            paymentStatus: paymentStatus,
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
       
        }
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
            .sort({createdOn:-1})
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



const orderCancel = async (req, res) => {
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

const PdfKit = require('pdfkit');
const fs = require('fs');
const path = require('path');

const getOrderPdf = async (req, res) => {
    try {
        const { orderId } = req.query;
        console.log(orderId)

        if (!orderId) {
            return res.status(400).json({ error: "Order ID is required" });
        }

        // Fetch order details by order ID
        const order = await Order.findById(orderId)
            .populate('userId', 'name email address')
            .populate('orderedItems.product', 'productName salePrice offerPrice')
            .exec();

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Calculate totals
        let totalOfferPrice = 0;
        order.orderedItems.forEach(item => {
            const offerPrice = item.product.offerPrice || 0;
            totalOfferPrice += offerPrice * item.quantity;
        });

        const couponDiscount = order.finalAmount > 0 ? (order.totalPrice - order.finalAmount) : 0;
        const orderRevenue = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;

        const totalDiscount = totalOfferPrice + couponDiscount;

        // Create the PDF
        const doc = new PdfKit({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=order_${order.orderId}.pdf`);
        doc.pipe(res);

        // Colors and styles
        const primaryColor = '#3B82F6';
        const secondaryColor = '#1E40AF';
        const textColor = '#1F2937';
        const lightGray = '#F3F4F6';
        const borderColor = '#D1D5DB';

        // Header Section
        doc.rect(0, 0, 595.28, 150).fill(primaryColor);
        doc.fill('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('SIT-WELL', 50, 50);
        doc.fontSize(14).font('Helvetica').text(`Order Report - ${order.orderId}`, 50, 80);
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 100);

        // Order Summary Section
        const summaryData = [
            { label: 'Order ID', value: order.orderId },
            { label: 'Order Date', value: new Date(order.createdOn).toLocaleDateString() },
            { label: 'Order Status', value: order.status },
            { label: 'Payment Method', value: order.paymentMethod },
            { label: 'Payment Status', value: order.paymentStatus || 'Not Provided' },
        ];

        let yPosition = 170;
        doc.fill(textColor);
        summaryData.forEach((data) => {
            doc.fontSize(12).font('Helvetica-Bold').text(`${data.label}:`, 50, yPosition, { continued: true });
            doc.font('Helvetica').text(` ${data.value}`, 150, yPosition);
            yPosition += 20;
        });

        // Customer Address Section
        const address = order.address[0];
        if (address) {
            doc.fontSize(14).font('Helvetica-Bold').text('Customer Address', 50, yPosition + 10);
            yPosition += 30;

            const addressDetails = [
                `${address.name}`,
                `${address.addressLine1}`,
                `${address.city}, ${address.state}, ${address.pinCode}`,
                `Phone: ${address.phone}`,
            ];

            addressDetails.forEach((line) => {
                doc.fontSize(12).font('Helvetica').text(line, 50, yPosition);
                yPosition += 20;
            });
        }

        // Order Items Section
        doc.fontSize(14).font('Helvetica-Bold').text('Ordered Items', 50, yPosition + 20);
        yPosition += 40;

        if (order.orderedItems.length === 0) {
            doc.fontSize(12).text('No items found in this order.', 50, yPosition);
        } else {
            // Table Header
            doc.fill(secondaryColor).rect(50, yPosition, 495, 30).fill();
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
            doc.text('Product', 55, yPosition + 10, { width: 200 });
            doc.text('Quantity', 255, yPosition + 10, { width: 60 });
            doc.text('Price', 315, yPosition + 10, { width: 60 });
            doc.text('Total', 375, yPosition + 10, { width: 70 });

            yPosition += 40;

            // Table Rows
            order.orderedItems.forEach((item) => {
                const itemTotal = item.quantity * item.price;

                doc.fillColor(textColor).fontSize(10).font('Helvetica');
                doc.text(item.productName, 55, yPosition, { width: 200 });
                doc.text(item.quantity.toString(), 255, yPosition, { width: 60 });
                doc.text(`${item.price.toFixed(2)}`, 315, yPosition, { width: 60 });
                doc.text(`${itemTotal.toFixed(2)}`, 375, yPosition, { width: 70 });

                yPosition += 20;

                // Add a new page if the content exceeds the page height
                if (yPosition > 750) {
                    doc.addPage();
                    yPosition = 50;
                }
            });
        }

        // Pricing Summary Section
        yPosition += 30;
        doc.fontSize(14).font('Helvetica-Bold').text('Pricing Summary', 50, yPosition);
        yPosition += 20;

        const pricingData = [
            { label: 'Total Price', value: `${order.totalPrice.toFixed(2)}` },
            { label: 'Discount', value: `${order.discount.toFixed(2)}` },
            { label: 'Final Amount', value: `${order.finalAmount.toFixed(2)}` },
        ];

        pricingData.forEach((data) => {
            doc.fontSize(12).font('Helvetica-Bold').text(`${data.label}:`, 50, yPosition, { continued: true });
            doc.font('Helvetica').text(` ${data.value}`, 150, yPosition);
            yPosition += 20;
        });

        // Footer Section
        doc.fontSize(10).fill(textColor).text('Thank you for shopping with us!', 50, 750, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message,
        });
    }
};








module.exports={
    getOrderSuccess,
    proceedTopayment,
    getOrderDetails,
    updateOrderStatus,
    getYourOrder,
    orderCancel,
    retrieveOrderDetails,
    approveReturnRequest,
    cancelReturnRequest,
    returnMessage,
    getOrderPdf,
}