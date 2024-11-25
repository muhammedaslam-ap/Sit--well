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
const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.render('admin_dashboard');
        } else {
            return res.redirect('/admin/adminlogin');
        }
    } catch (error) {
        console.error(error);
        return res.redirect('/pageNotFound');
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

        const query = dateRange ? { createdOn: dateRange } : {};

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .skip(skip)  
            .limit(limit) 
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'name price offerPrice');

        let totalOrderAmount = 0;
        let totalDiscount = 0;
        let totalOfferPrice = 0
        

        const order = await Order.find(query)
        .populate('userId', 'name email')
        .populate('orderedItems.product', 'name price offerPrice');


        order.forEach(order => {
            for (let item of order.orderedItems) {
                let product = item.product; 
          
                let offerPrice = product.offerPrice || 0; 
                totalOfferPrice += offerPrice*item.quantity;
              }
            //   console.log(totalOfferPrice)
            let orderTotal = order.finalAmount > 0 ? order.finalAmount : order.totalPrice;
            totalOrderAmount += orderTotal;



            if (order.finalAmount > 0) {
                let discountForOrder = order.totalPrice - order.finalAmount;
                totalDiscount += discountForOrder;
            }
        });

        res.render('admin_salesReport', {
            orders,
            totalOrderAmount: totalOrderAmount.toFixed(2),
            totalDiscount: totalDiscount.toFixed(2),
            totalOfferPrice :totalOfferPrice + totalDiscount,
            totalOrders,
            totalPages,
            currentPage: page,
            timeFilter,
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
        const { timeFilter,orderStatus } = req.query;
        // console.log(timeFilter);
        
        
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
                // Add status filter for day only
                if (orderStatus) {
                    statusFilter = { status: orderStatus };
                }
                periodText = `Daily Report - ${orderStatus || 'All Statuses'} (${startOfDay.toLocaleDateString()})`;
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

        // Combine date range and status filters
        const queryFilter = {
            ...dateRange,
            ...statusFilter
        };

        // Fetch orders with combined filters
        const orders = await Order.find(queryFilter)
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'productName salePrice')
            .sort({ createdOn: -1 });

        // Calculate totals
        const totals = orders.reduce((acc, order) => {
            const orderTotal = order.finalAmount || order.totalPrice;
            const discount = order.finalAmount > 0 ? order.totalPrice - order.finalAmount : 0;
            
            return {
                totalAmount: acc.totalAmount + orderTotal,
                totalDiscount: acc.totalDiscount + discount,
                count: acc.count + 1
            };
        }, { totalAmount: 0, totalDiscount: 0, count: 0 });

        const doc = new PdfKit({
            size: 'A4',
            margin: 50
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report_${timeFilter}.pdf`);
        doc.pipe(res);

        // Helper functions remain the same
        function drawLine(doc, startX, startY, endX, endY, color = '#E5E7EB', width = 1) {
            doc.strokeColor(color)
               .lineWidth(width)
               .moveTo(startX, startY)
               .lineTo(endX, endY)
               .stroke();
        }

        function drawBox(doc, x, y, width, height, backgroundColor = '#F3F4F6') {
            doc.rect(x, y, width, height)
               .fill(backgroundColor);
        }

        // Header section
        drawBox(doc, 50, 30, 100, 40, '#0066cc');
        doc.fillColor('#FFFFFF')
           .fontSize(16)
           .text('SIT-WELL', 65, 42);

        // Update the report title to include status if it's a daily report
        if (timeFilter === 'day' && orderStatus) {
            doc.fillColor('#111827')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text(`Sales Report - ${orderStatus}`, 180, 35);
        } else {
            doc.fillColor('#111827')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text('Sales Report', 180, 35);
        }

        // Report period and generation info
        drawBox(doc, 50, 90, 495, 70, '#F9FAFB');
        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica')
           .text(`Generated: ${new Date().toLocaleString()}`, 70, 105)
           .text(`Period: ${periodText}`, 70, 125);

        // Add a status summary section for daily reports
        if (timeFilter === 'day' && orderStatus) {
            drawBox(doc, 50, 270, 495, 40, '#F9FAFB');
            doc.fontSize(12)
               .fillColor('#374151')
               .font('Helvetica-Bold')
               .text(`Status Filter: ${orderStatus}`, 70, 285);
        }

        // Summary statistics
        const summaryBoxes = [
            { label: 'Total Orders', value: totals.count },
            { label: 'Total Revenue', value: totals.totalAmount.toFixed(2)},
            { label: 'Total Discount', value: totals.totalDiscount.toFixed(2)},
            { label: 'Avg. Order Value', value: (totals.totalAmount / totals.count || 0).toFixed(2)}
        ];

        let boxX = 50;
        summaryBoxes.forEach((box) => {
            drawBox(doc, boxX, 180, 115, 80, '#F3F4F6');
            doc.fontSize(10)
               .fillColor('#6B7280')
               .text(box.label, boxX + 10, 195)
               .fontSize(14)
               .fillColor('#111827')
               .font('Helvetica-Bold')
               .text(box.value, boxX + 10, 220);
            boxX += 125;
        });

        // Orders section
        let yPosition = 330;

        if (orders.length === 0) {
            // No orders message
            doc.fontSize(12)
               .fillColor('#374151')
               .text('No orders found for this period.', 50, yPosition + 20);
        } else {
            // Orders table header
            drawBox(doc, 50, yPosition, 495, 30, '#F3F4F6');
            doc.fontSize(12)
               .fillColor('#374151')
               .font('Helvetica-Bold')
               .text('Order Details', 70, yPosition + 10);

            yPosition += 40;

            // Render each order
            orders.forEach((order, index) => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }

                // Order header with formatted date
                const orderDate = new Date(order.createdOn).toLocaleDateString();
                drawBox(doc, 50, yPosition, 495, 40, '#F9FAFB');
                doc.fontSize(12)
                   .fillColor('#111827')
                   .font('Helvetica-Bold')
                   .text(`Order #${index + 1} - ${orderDate}`, 70, yPosition + 10)
                   .fontSize(10)
                   .fillColor('#6B7280')
                   .font('Helvetica')
                   .text(`Customer: ${order.userId.name}`, 200, yPosition + 10)
                   .text(`Email: ${order.userId.email}`, 200, yPosition + 25);

                yPosition += 50;

                // Products table
                drawLine(doc, 70, yPosition, 525, yPosition, '#E5E7EB');
                yPosition += 10;
                
                // Table headers
                doc.fontSize(10)
                   .fillColor('#374151')
                   .font('Helvetica-Bold')
                   .text('Product', 70, yPosition)
                   .text('Price (₹)', 400, yPosition);

                yPosition += 20;

                // Product rows
                order.orderedItems.forEach(item => {
                    if (yPosition > 750) {
                        doc.addPage();
                        yPosition = 50;
                    }

                    doc.font('Helvetica')
                       .fontSize(10)
                       .fillColor('#4B5563')
                       .text(item.product.productName, 70, yPosition, { width: 300 })
                       .fillColor('#111827')
                       .text(item.product.salePrice.toFixed(2), 400, yPosition);

                    yPosition += 20;
                });

                // Order total with discount if applicable
                drawBox(doc, 350, yPosition, 195, 30, '#F9FAFB');
                doc.fontSize(11)
                   .fillColor('#111827')
                   .font('Helvetica-Bold');
                
                if (order.finalAmount && order.finalAmount !== order.totalPrice) {
                    doc.text(`Original:` ,order.totalPrice.toFixed(2), 400, yPosition + 5)
                       .text('Final:', order.finalAmount.toFixed(2), 400, yPosition + 20);
                } else {
                    doc.text(`Total: `,order.totalPrice.toFixed(2), 400, yPosition + 10);
                }

                yPosition += 50;
            });
        }

        // Footer
        doc.fontSize(8)
           .fillColor('#9CA3AF')
           .text('Confidential Business Document', 50, 780, { align: 'center' })
           .text(`Generated on ${new Date().toLocaleDateString()} | Page ${doc.bufferedPageRange().count}`, 50, 795, { align: 'center' });

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
                if (orderStatus) {
                    statusFilter = { status: orderStatus };
                }
                periodText = `Daily Report - ${orderStatus || 'All Statuses'} (${startOfDay.toLocaleDateString()})`;
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

        // Combine date range and status filters
        const queryFilter = {
            ...dateRange,
            ...statusFilter
        };

        // Fetch orders with combined filters
        const orders = await Order.find(queryFilter)
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'productName salePrice')
            .sort({ createdOn: -1 });

        // Calculate totals
        const totals = orders.reduce((acc, order) => {
            const orderTotal = order.finalAmount || order.totalPrice;
            const discount = order.finalAmount > 0 ? order.totalPrice - order.finalAmount : 0;

            return {
                totalAmount: acc.totalAmount + orderTotal,
                totalDiscount: acc.totalDiscount + discount,
                count: acc.count + 1
            };
        }, { totalAmount: 0, totalDiscount: 0, count: 0 });

        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add title to the sheet
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = `Sales Report - ${periodText}`;
        worksheet.getCell('A1').font = { size: 16, bold: true };

        // Add summary data
        worksheet.addRow([]);
        worksheet.addRow(['Total Orders', 'Total Revenue', 'Total Discount', 'Avg. Order Value']);
        worksheet.addRow([
            totals.count,
            totals.totalAmount.toFixed(2),
            totals.totalDiscount.toFixed(2),
            (totals.totalAmount / totals.count || 0).toFixed(2)
        ]);

        worksheet.addRow([]);

        // Add order data
        worksheet.addRow(['Order #', 'Date', 'Customer Name', 'Customer Email', 'Product', 'Price (₹)']);
        
        // Add each order's data
        orders.forEach((order, index) => {
            const orderDate = new Date(order.createdOn).toLocaleDateString();
            order.orderedItems.forEach(item => {
                worksheet.addRow([
                    `Order #${index + 1}`,
                    orderDate,
                    order.userId.name,
                    order.userId.email,
                    item.product.productName,
                    item.product.salePrice.toFixed(2)
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

        // Set the response headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report_${timeFilter}.xlsx`);

        // Write the workbook to the response stream
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating Excel file',
            error: error.message
        });
    }
};


module.exports = {
    loadlogin,
    login,
    loadDashboard,
    pageError,
    logout,
    getSalesReport,
    getDownloadPdf,
    getDownloadExel
};
