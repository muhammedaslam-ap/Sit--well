const express=require('express')
const userRoute = express()
const passport=require('passport')
const {userAuth,adminAuth} = require('../middleware/auth')
userRoute.set('view engine','ejs')
userRoute.set('views','./views/user')


const userController=require('../controller/userController') 
const profileController = require('../controller/profileController')
const addressConroller = require('../controller/addressController')
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')

userRoute.get('/',userController.landing)

userRoute.get('/pageNotFound',userController.pageNotFound)


userRoute.get('/logout',userController.userLogout)
userRoute.get('/login',userController.loadLogin)
userRoute.post('/login',userController.login)
userRoute.get('/signup',userController.loadsignup)
userRoute.post('/signup',userController.signup)
userRoute.post('/verify-otp',userController.verifyotp);
userRoute.post('/resend-otp',userController.resendOtp)
userRoute.get('/productDetails/:id', userController.productDetails);
userRoute.get('/shop',userController.shop)


userRoute.get('/forgetPassword',profileController.getForgotPassPage)
userRoute.post('/forgot-email-valid',profileController.forgotEmailValid)
userRoute.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
userRoute.get('/reset-password',profileController.getResetPassPage)
userRoute.post('/resend-forgot-otp',profileController.resendOtp)
userRoute.post('/reset-password',profileController.postNewPassword)
userRoute.get('/userProfile',userAuth,profileController.getUserProfile)
userRoute.post('/update-profile',userAuth,profileController.updateProfile)



userRoute.get('/addAddress',userAuth,addressConroller.getaddAddress)
userRoute.post('/addAddress',userAuth,addressConroller.postAddAddress)
userRoute.get('/editAddress/:id',userAuth,addressConroller.getEditAddress)
userRoute.post('/updateAddress/:id',userAuth,addressConroller.updateAddress)
userRoute.post('/deleteAddress/:id',userAuth,addressConroller.deleteAddress)

userRoute.get('/cart',userAuth,cartController.getAddToCart)
userRoute.post('/addToCart',userAuth,cartController.addToCart)
userRoute.patch('/cart/updateQuantity', userAuth, cartController.updateCartItemQuantity);
userRoute.delete('/cart/remove',userAuth,cartController.removeCartProduct)
userRoute.post("/update-product-quantity",cartController.updateProductQuantity);


userRoute.get('/checkout',userAuth,cartController.getCheckOut)
userRoute.get('/orderSuccess',userAuth,orderController.getOrderSuccess)
userRoute.post('/proceedToPayment',userAuth,orderController.proceedTopayment)


       



userRoute.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

userRoute.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    req.session.user = req.user; 
    res.redirect('/'); 
});

module.exports=userRoute;