const User = require('../models/userSchema');
const Order = require('../models/orderSchema')
const Coupon = require('../models/couponSchema')
const Category = require('../models/categorySchema')
const bcrypt = require('bcrypt');

// Load Admin Login Page
const loadlogin = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }
        res.render('admin_login', { message: null });  
    } catch (error) {
        console.error(error);
        res.redirect('/pageError');
    }
};

// Handle Admin Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email: email, is_admin: true });

        if (admin) { 
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = {
                    id: admin._id, 
                    email: admin.email,
                };

                return res.redirect('/admin/dashboard');
            } else {
                return res.render('admin_login', { message: 'Incorrect password' });
            }
        } else {
            return res.render('admin_login', { message: 'Admin not found' });
        }
    } catch (error) {
        console.error("Error during admin login:", error);
        res.redirect('/pageError');
    }
};



// Load Admin Dashboard
const loadDashbord = async (req, res) => {
    try {
        const { timeFilter, page = 1 } = req.query;
        const limit = 6; // Number of orders per page
        const skip = (page - 1) * limit;

        const now = new Date();
        let dateRange = null;

        // Determine the date range based on the time filter
        switch (timeFilter) {
            case 'day':
                dateRange = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lt: new Date(now.setHours(23, 59, 59, 999))
                };
                break;
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); // First day of the week
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6); // Last day of the week
                dateRange = { $gte: startOfWeek, $lt: endOfWeek };
                break;
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                dateRange = { $gte: startOfMonth, $lt: endOfMonth };
                break;
            case 'year':
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31);
                dateRange = { $gte: startOfYear, $lt: endOfYear };
                break;
            default:
                dateRange = null;
        }

        // Create the query for fetching orders
        const query = {
            ...dateRange ? { createdOn: dateRange } : {}, // Add date range if it exists
            paymentStatus: { $ne: 'failed' } // Exclude failed payments
        };

        // Fetch total number of orders
        let totalOrders = 0;
        try {
            totalOrders = await Order.countDocuments(query);
            console.log('Total Orders:', totalOrders);
        } catch (err) {
            console.error('Error fetching totalOrders:', err);
        }

        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch paginated orders
        const orders = await Order.find(query)
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'name price offerPrice');

        // Fetch all orders for revenue and discount calculations
        const allOrders = await Order.find(query)
            .populate('orderedItems.product', 'offerPrice');

        let totalOrderAmount = 0;
        let totalDiscount = 0;
        let totalOfferPrice = 0;

        // Calculate total revenue, discount, and offer price
        allOrders.forEach(order => {
            let orderTotal = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;
            totalOrderAmount += orderTotal;

            if (order.finalAmount > 0) {
                totalDiscount += (order.totalPrice - order.finalAmount);
            }

            order.orderedItems.forEach(item => {
                totalOfferPrice += (item.product.offerPrice || 0) * item.quantity;
            });
        });

        totalOfferPrice += totalDiscount;

        // Prepare sales data for the graph
        const salesData = await Order.aggregate([
            {
                $match: {
                    ...query // Apply the same filter to graph data
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdOn" },
                        month: { $month: "$createdOn" },
                        year: { $year: "$createdOn" }
                    },
                    totalRevenue: { $sum: { $cond: [{ $gt: ["$finalAmount", 0] }, "$finalAmount", "$totalPrice"] } },
                    totalDiscount: { $sum: { $subtract: ["$totalPrice", "$finalAmount"] } },
                    orderCount: { $sum: 1 },
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);

        const formattedSalesData = salesData.map(data => {
            const { day, month, year } = data._id;
            return {
                _id: `${day}-${month}-${year}`,
                totalRevenue: data.totalRevenue,
                totalDiscount: data.totalDiscount,
                orderCount: data.orderCount
            };
        });

        const mostBoughtProducts = await Order.aggregate([
            {
                $match: {
                    ...dateRange ? { createdOn: dateRange } : {}, // Apply date filter if exists
                    paymentStatus: { $ne: 'failed' }
                }
            },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: 'products', // Ensure this matches your product collection name
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$orderedItems.product",
                    productName: { $first: "$productDetails.productName" }, // Explicitly use productName
                    categoryId: { $first: "$productDetails.category" },
                    totalQuantity: { $sum: "$orderedItems.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } }
                }
            },
            {
                $lookup: {
                    from: 'categories', // Lookup category details
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    categoryName: "$categoryDetails.name", // Get category name
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);
        
        // Debug logging
        console.log('Most Bought Products Raw:', JSON.stringify(mostBoughtProducts, null, 2));
        
        // Processing the results
        const processedMostBoughtProducts = mostBoughtProducts.map(product => ({
            name: product.productName || 'Unknown Product',
            category: product.categoryName || 'Uncategorized',
            totalQuantity: product.totalQuantity || 0,
            totalRevenue: (product.totalRevenue || 0).toFixed(2)
        }));
        const mostBoughtCategories = await Order.aggregate([
            {
                $match: {
                    ...dateRange ? { createdOn: dateRange } : {}, // Apply date filter if exists
                    paymentStatus: { $ne: 'failed' }
                }
            },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: 'categories', // Lookup category details
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails.name", // Use category name
                    totalQuantity: { $sum: "$orderedItems.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);
        
        
        
        const processedMostBoughtCategories = mostBoughtCategories.map(category => ({
            name: category._id || 'Unknown Category',
            totalQuantity: category.totalQuantity || 0,
            totalRevenue: (category.totalRevenue || 0).toFixed(2)
        }));

       
        res.render('admin_dashboard', {
            orders,
            totalOrderAmount: totalOrderAmount.toFixed(2),
            totalDiscount: totalDiscount.toFixed(2),
            totalOfferPrice: totalOfferPrice.toFixed(2),
            totalOrders,
            totalPages,
            currentPage: parseInt(page),
            timeFilter,
            mostBoughtProducts:processedMostBoughtProducts,
            mostBoughtCategories:processedMostBoughtCategories,
            salesGraphData: {
                labels: formattedSalesData.map(data => data._id),
                revenue: formattedSalesData.map(data => data.totalRevenue),
                discounts: formattedSalesData.map(data => data.totalDiscount),
                orderCounts: formattedSalesData.map(data => data.orderCount)
            },
            salesData: formattedSalesData
        });

    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
};



const pageError = async (req,res)=>{
    res.render('admin_error')
}
const logout = async (req,res)=>{
   try {

    req.session.destroy(error => {
        if(error){
            console.error(error)
            return res.redirect('/admin/pageerror')
        }
        res.redirect('/admin/login')
    })
   } catch (error) {

    console.error(error)
    return res.redirect("/admin/pageError")

   } 
}





const getSalesReport = async (req, res) => {
    try {
        const { timeFilter, page = 1 } = req.query;  
        const limit = 6;                             
        const skip = (page - 1) * limit;             

        const now = new Date();                    
        let dateRange = null;                      

        switch (timeFilter) {
            case 'day':
                dateRange = {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lt: new Date(now.setHours(23, 59, 59, 999)) 
                };
                break;
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); 
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6); 
                dateRange = { $gte: startOfWeek, $lt: endOfWeek };
                break;
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);  
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                dateRange = { $gte: startOfMonth, $lt: endOfMonth };
                break;
            case 'year':
                const startOfYear = new Date(now.getFullYear(), 0, 1);               
                const endOfYear = new Date(now.getFullYear(), 11, 31);               
                dateRange = { $gte: startOfYear, $lt: endOfYear };
                break;
            default:
                dateRange = null;
        }

        // Filter orders by the selected time range and exclude failed payments
        const query = {
            ...dateRange ? { createdOn: dateRange } : {},
            paymentStatus: { $ne: 'failed' } // Exclude failed payments
        };

        // Total Orders and Pagination
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .sort({ createdOn: -1 })
            .skip(skip)  
            .limit(limit) 
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'name price offerPrice');

        // Total Revenue, Discount, and Offer Price
        const allOrders = await Order.find(query)
            .populate('orderedItems.product', 'offerPrice');

        let totalOrderAmount = 0;
        let totalDiscount = 0;
        let totalOfferPrice = 0;

        allOrders.forEach(order => {
            let orderTotal = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;
            totalOrderAmount += orderTotal;

            if (order.finalAmount > 0) {
                totalDiscount += (order.totalPrice - order.finalAmount);
            }

            order.orderedItems.forEach(item => {
                totalOfferPrice += (item.product.offerPrice || 0) * item.quantity;
            });
        });

        totalOfferPrice += totalDiscount;

        // Sales Data for Graph
        const salesData = await Order.aggregate([
            {
                $match: {
                    ...query // Apply the same filter to graph data
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdOn" },
                        month: { $month: "$createdOn" },
                        year: { $year: "$createdOn" }
                    },
                    totalRevenue: { $sum: { $cond: [{ $gt: ["$finalAmount", 0] }, "$finalAmount", "$totalPrice"] } },
                    totalDiscount: { $sum: { $subtract: ["$totalPrice", "$finalAmount"] } },
                    orderCount: { $sum: 1 },
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);

        const formattedSalesData = salesData.map(data => {
            const { day, month, year } = data._id;
            return {
                _id: `${day}-${month}-${year}`,
                totalRevenue: data.totalRevenue,
                totalDiscount: data.totalDiscount,
                orderCount: data.orderCount
            };
        });

        // Render the Sales Report Page
        res.render('admin_salesReport', {
            orders,
            totalOrderAmount: totalOrderAmount.toFixed(2),
            totalDiscount: totalDiscount.toFixed(2),
            totalOfferPrice: totalOfferPrice.toFixed(2),
            totalOrders,
            totalPages,
            currentPage: parseInt(page),
            timeFilter,
            salesGraphData: {
                labels: formattedSalesData.map(data => data._id),
                revenue: formattedSalesData.map(data => data.totalRevenue),
                discounts: formattedSalesData.map(data => data.totalDiscount),
                orderCounts: formattedSalesData.map(data => data.orderCount)
            },
            salesData: formattedSalesData
        });

    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
};


const PdfKit = require('pdfkit');

// Generate PDF for Sales Report without pagination
const getDownloadPdf = async (req, res) => {
    try {
        const { timeFilter, orderStatus } = req.query;
        const now = new Date();
        let dateRange = {};
        let periodText = '';
        let statusFilter = {};

        switch (timeFilter) {
            case 'day':
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfDay, $lt: endOfDay } };
                if (orderStatus) {
                    statusFilter = { status: orderStatus };
                }
                periodText = `Daily Report - ${orderStatus || 'All Statuses'} (${startOfDay.toLocaleDateString()})`;
                break;

            case 'week':
                const currentDay = now.getDay();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfWeek, $lt: endOfWeek } };
                periodText = `Weekly Report (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()})`;
                break;

            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfMonth, $lt: endOfMonth } };
                periodText = `Monthly Report (${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()})`;
                break;

            case 'year':
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfYear, $lt: endOfYear } };
                periodText = `Yearly Report (${now.getFullYear()})`;
                break;

            default:
                const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                dateRange = { createdOn: { $gte: defaultStart, $lt: defaultEnd } };
                periodText = `Monthly Report (${defaultStart.toLocaleDateString()} - ${defaultEnd.toLocaleDateString()})`;
        }

        const queryFilter = { ...dateRange, ...statusFilter };

        // Fetch orders
        const orders = await Order.find(queryFilter)
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'productName salePrice offerPrice')
            .sort({ createdOn: -1 });

        // Initialize totals
        let totalOrderAmount = 0;
        let totalCouponDiscount = 0;
        let totalOfferPrice = 0;
        let totalOrders = orders.length;

        // Calculate totals
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const offerPrice = item.product.offerPrice || 0;
                totalOfferPrice += offerPrice * item.quantity;
            });

            const couponDiscount = order.finalAmount > 0 ? (order.totalPrice - order.finalAmount) : 0;
            totalCouponDiscount += couponDiscount;

            const orderRevenue = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;
            totalOrderAmount += orderRevenue;
        });

        const totalDiscount = totalOfferPrice + totalCouponDiscount;

        // Create the PDF
        const doc = new PdfKit({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report_${timeFilter}.pdf`);
        doc.pipe(res);

        // Define colors
        const primaryColor = '#3B82F6';
        const secondaryColor = '#1E40AF';
        const textColor = '#1F2937';
        const lightGray = '#F3F4F6';
        const borderColor = '#D1D5DB';

        // Header
        doc.rect(0, 0, 595.28, 150).fill(primaryColor);
        doc.fill('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('SIT-WELL', 50, 50);
        doc.fontSize(14).font('Helvetica').text(`Sales Report - ${periodText}`, 50, 80);
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 100);

        // Summary Section
        const summaryBoxes = [
            { label: 'Total Orders', value: totalOrders },
            { label: 'Total Revenue', value: `${totalOrderAmount.toFixed(2)}` },
            { label: 'Coupon Discount', value: `${totalCouponDiscount.toFixed(2)}` },
            { label: 'Total Discount', value: `${totalDiscount.toFixed(2)}` }
        ];

        doc.fill(textColor);
        summaryBoxes.forEach((box, index) => {
            const x = 50 + (index % 2) * 247.5;
            const y = 170 + Math.floor(index / 2) * 80;
            doc.roundedRect(x, y, 227.5, 70, 5).fill(lightGray);
            doc.fontSize(12).font('Helvetica-Bold').fill(secondaryColor).text(box.label, x + 10, y + 10);
            doc.fontSize(18).font('Helvetica-Bold').fill(textColor).text(box.value, x + 10, y + 30);
        });

        // Order Details Section
        let yPosition = 340;
        if (orders.length === 0) {
            doc.fontSize(14).fill(textColor).text('No orders found for this period.', 50, yPosition);
        } else {
            // Table header
            doc.fill(secondaryColor).rect(50, yPosition, 495, 30).fill();
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
            doc.text('Order', 55, yPosition + 10, { width: 50 });
            doc.text('Customer', 105, yPosition + 10, { width: 80 });
            doc.text('Product', 185, yPosition + 10, { width: 120 });
            doc.text('Quantity', 305, yPosition + 10, { width: 60 });
            doc.text('Price', 365, yPosition + 10, { width: 60 });
            doc.text('Total', 425, yPosition + 10, { width: 70 });

            yPosition += 40;

            orders.forEach((order, index) => {
                const orderDate = new Date(order.createdOn).toLocaleDateString();
                const orderTotal = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;

                order.orderedItems.forEach((item, itemIndex) => {
                    if (yPosition > 700) {
                        doc.addPage();
                        yPosition = 50;
                    }

                    doc.fillColor(textColor).fontSize(9).font('Helvetica');
                    if (itemIndex === 0) {
                        doc.text(`#${index + 1}`, 55, yPosition, { width: 50 });
                        doc.text(orderDate, 55, yPosition + 12, { width: 50 });
                        doc.text(order.userId.name, 105, yPosition, { width: 80 });
                        doc.text(order.userId.email, 105, yPosition + 12, { width: 80, fontSize: 8 });
                    }
             
                    doc.text(item.product.productName, 185, yPosition, { width: 120 });
                    doc.text(item.quantity.toString(), 305, yPosition, { width: 60 });
                    doc.text(`${item.product.salePrice.toFixed(2)}`, 365, yPosition, { width: 60 });
                    
                    if (itemIndex === order.orderedItems.length - 1) {
                        doc.text(`${orderTotal.toFixed(2)}`, 425, yPosition, { width: 70 });
                    }

                    yPosition += 25;
                });

                // Draw a line between orders
                doc.moveTo(50, yPosition - 5).lineTo(545, yPosition - 5).stroke(borderColor);
                yPosition += 10;
            });
        }

        // Footer
        doc.fontSize(10).fill(textColor).text('Thank you for your business!', 50, 750, { align: 'center' });
        doc.text('Page 1 of 1', 500, 750);

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message
        });
    }
};




const ExcelJS = require('exceljs');

const getDownloadExel = async (req, res) => {
    try {
        const { timeFilter, orderStatus } = req.query;

        const now = new Date();
        let dateRange = {};
        let periodText = '';
        let statusFilter = {};

        // Set the date range and status filter based on the selected time filter
        switch (timeFilter) {
            case 'day':
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfDay, $lt: endOfDay } };
                periodText = `Daily Report (${startOfDay.toLocaleDateString()})`;
                break;

            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfWeek, $lt: endOfWeek } };
                periodText = `Weekly Report (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()})`;
                break;

            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfMonth, $lt: endOfMonth } };
                periodText = `Monthly Report (${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()})`;
                break;

            case 'year':
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                dateRange = { createdOn: { $gte: startOfYear, $lt: endOfYear } };
                periodText = `Yearly Report (${now.getFullYear()})`;
                break;

            default:
                const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                dateRange = { createdOn: { $gte: defaultStart, $lt: defaultEnd } };
                periodText = `Monthly Report (${defaultStart.toLocaleDateString()} - ${defaultEnd.toLocaleDateString()})`;
        }

        if (orderStatus) {
            statusFilter = { status: orderStatus };
        }

        const queryFilter = { ...dateRange, ...statusFilter };

        // Fetch orders
        const orders = await Order.find(queryFilter)
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'productName salePrice offerPrice')
            .sort({ createdOn: -1 });

        // Initialize totals
        let totalOrderAmount = 0;
        let totalCouponDiscount = 0;
        let totalOfferPrice = 0;
        let totalOrders = orders.length;

        // Calculate totals
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const offerPrice = item.product.offerPrice || 0;
                totalOfferPrice += offerPrice * item.quantity;
            });

            const couponDiscount = order.finalAmount > 0 ? (order.totalPrice - order.finalAmount) : 0;
            totalCouponDiscount += couponDiscount;

            const orderRevenue = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;
            totalOrderAmount += orderRevenue;
        });

        const totalDiscount = totalOfferPrice + totalCouponDiscount;

        // Create the Excel file
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add title
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = `Sales Report - ${periodText}`;
        worksheet.getCell('A1').font = { size: 16, bold: true };

        // Add summary
        worksheet.addRow([]);
        worksheet.addRow(['Total Orders', 'Total Revenue', 'Total Coupon Discount', 'Total Offer Price', 'Total Discount']);
        worksheet.addRow([
            totalOrders,
            totalOrderAmount.toFixed(2),
            totalCouponDiscount.toFixed(2),
            totalOfferPrice.toFixed(2),
            totalDiscount.toFixed(2)
        ]);

        // Add blank row
        worksheet.addRow([]);

        // Add order data header
        worksheet.addRow(['Order #', 'Date', 'Customer Name', 'Customer Email', 'Product', 'Price (₹)', 'Quantity']);
        orders.forEach((order, index) => {
            const orderDate = new Date(order.createdOn).toLocaleDateString();
            order.orderedItems.forEach(item => {
                worksheet.addRow([
                    `Order #${index + 1}`,
                    orderDate,
                    order.userId.name,
                    order.userId.email,
                    item.product.productName,
                    item.product.salePrice,
                    item.quantity
                ]);
            });
        });

        // Set column widths
        worksheet.getColumn(1).width = 15;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 30;
        worksheet.getColumn(5).width = 40;
        worksheet.getColumn(6).width = 15;
        worksheet.getColumn(7).width = 10;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report_${timeFilter}.xlsx`);

        // Write and send the Excel file
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).json({ success: false, message: 'Error generating Excel file', error: error.message });
    }
};



module.exports = {
    loadlogin,
    login,
    pageError,
    logout,
    getSalesReport,
    getDownloadPdf,
    getDownloadExel,
    loadDashbord
};
