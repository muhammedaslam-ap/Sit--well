const express = require('express')
const adminRoute = express()
const path = require('path')
adminRoute.set('views','./views/admin');
const multer = require('multer');
const fs = require('fs')
const {userAuth,adminAuth} = require('../middleware/auth')
const adminController = require('../controller/admin/adminController')
const costomerController = require('../controller/admin/costomerController')
const categoryConroller  = require('../controller/admin/categoryController')
const productController = require('../controller/admin/productController')


adminRoute.get('/admin/pageerror',adminController.pageError)
adminRoute.get('/login', adminController.loadlogin);
adminRoute.post('/login', adminController.login);
adminRoute.get('/dashboard',adminAuth,adminController.loadDashboard);
adminRoute.get('/logout',adminController.logout)
///costomers menagement
adminRoute.get('/users',adminAuth,costomerController.costomerInfo)
adminRoute.get('/blockCustomer',adminAuth,costomerController.costomerBlocked)
adminRoute.get('/unblockCustomer',adminAuth,costomerController.costomerUnblocked)
///category menagement
adminRoute.get('/category',adminAuth,categoryConroller.categoryInfo)
adminRoute.post('/addCategory',adminAuth,categoryConroller.addCategory)
// adminRoute.post('/addCategoryOffer',adminAuth,categoryConroller.addCategoryOffer)
// adminRoute.post('/removeCategoryOffer',adminAuth,categoryConroller.removeCategoryOffer)
adminRoute.get('/listCategory',adminAuth,categoryConroller.listCategory)
adminRoute.get('/unlistCategory',adminAuth,categoryConroller.unlistCategory)
adminRoute.get('/editCategory',adminAuth,categoryConroller.editCategory)
adminRoute.post('/editCategory/:id',adminAuth,categoryConroller.postEditCategory)









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
adminRoute.get('/product',adminAuth,productController.getProductAddPage)
adminRoute.post('/addProduts', adminAuth, uploads.array("images", 4), productController.addProduts);





module.exports = adminRoute