const express = require('express')
const adminRoute = express()
const path = require('path')
adminRoute.set('views','./views/admin');
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

//product menagement
adminRoute.get('/product',adminAuth,productController.getProductAddPage)





module.exports = adminRoute