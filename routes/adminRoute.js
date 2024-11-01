const express = require('express')
const adminRoute = express()
const path = require('path')
adminRoute.set('views','./views/admin');
const multer = require('multer');
const fs = require('fs')
const {userAuth,adminAuth} = require('../middleware/auth')
const adminController = require('../controller/adminController')
const userController = require('../controller/userController')
const categoryConroller  = require('../controller/categoryController')
const productController = require('../controller/productController')
const orderController = require('../controller/orderController')



adminRoute.get('/admin/pageerror',adminController.pageError)
adminRoute.get('/login', adminController.loadlogin);
adminRoute.post('/login', adminController.login);
adminRoute.get('/dashboard',adminAuth,adminController.loadDashboard);
adminRoute.get('/logout',adminController.logout)


///costomers menagement
adminRoute.get('/users',adminAuth,userController.costomerInfo)
adminRoute.get('/blockCustomer',adminAuth,userController.costomerBlocked)
adminRoute.get('/unblockCustomer',adminAuth,userController.costomerUnblocked)


///category menagement
adminRoute.get('/category',adminAuth,categoryConroller.categoryInfo)
adminRoute.post('/addCategory',adminAuth,categoryConroller.addCategory)
// adminRoute.post('/addCategoryOffer',adminAuth,categoryConroller.addCategoryOffer)
// adminRoute.post('/removeCategoryOffer',adminAuth,categoryConroller.removeCategoryOffer)
adminRoute.get('/listCategory',adminAuth,categoryConroller.listCategory)
adminRoute.get('/unlistCategory',adminAuth,categoryConroller.unlistCategory)
adminRoute.get('/editCategory',adminAuth,categoryConroller.editCategory)
adminRoute.post('admin/editCategory/:id',adminAuth,categoryConroller.postEditCategory)





// Define multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'public/uploads/product-images');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true }); // Create directory if it doesn't exist
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});


 
const uploads = multer({ storage: storage });
//product menagement
adminRoute.get("/addProducts", adminAuth, productController.getProductAddPage);
adminRoute.post("/addProducts", adminAuth, uploads.array("images", 4), productController.addProduct); 
adminRoute.get("/products",adminAuth,productController.getAllProducts);
adminRoute.get("/blockProduct",adminAuth,productController.blockProduct);
adminRoute.get("/unblockProduct",adminAuth,productController.unblockProduct);
adminRoute.get("/editProduct",adminAuth,productController.getEditProduct);
adminRoute.post("/editProduct/:id", adminAuth, uploads.array("images", 4), productController.editProduct)
adminRoute.post("/deleteImage", adminAuth, productController.deleteSingleImage);


adminRoute.get('/orderDetails',adminAuth,orderController.getOrderDetails)
adminRoute.post('/order/updateStatus/:orderId', adminAuth, orderController.updateOrderStatus);










module.exports = adminRoute