const express=require('express')
const userRoute = express()
const passport=require('passport')
const {userAuth,adminAuth} = require('../middleware/auth')
const Wallet  = require('../models/walletSchema')
userRoute.set('view engine','ejs')
userRoute.set('views','./views/user')
const Order = require('../models/orderSchema'); 



const userController=require('../controller/userController') 
const profileController = require('../controller/profileController')
const addressConroller = require('../controller/addressController')
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')
const whishlistController = require('../controller/whishlistController')
const paymentController = require('../controller/paypalController')
const couponController = require('../controller/couponController')
const walletController = require('../controller/walletController')

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
userRoute.get('/about',userController.getAboutPage)
userRoute.get('/contact',userController.getContactPage)


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
userRoute.post('/checkout/addAddressFromCheckout',userAuth,addressConroller.addAddressFromCheckout)

userRoute.get('/cart',userAuth,cartController.getAddToCart)
userRoute.post('/addToCart',userAuth,cartController.addToCart)
userRoute.post('/addToCartFromWishlist',userAuth,cartController.addToCartFromWishlist)
userRoute.patch('/cart/updateQuantity', userAuth, cartController.updateCartItemQuantity);
userRoute.delete('/cart/remove',userAuth,cartController.removeCartProduct)
userRoute.post("/update-product-quantity",cartController.updateProductQuantity);
userRoute.get('/checkout',userAuth,cartController.getCheckOut)



userRoute.get('/orderSuccess',userAuth,orderController.getOrderSuccess)
userRoute.post('/proceedToPayment',userAuth,orderController.proceedTopayment)
userRoute.get('/proceedToPayment',userAuth,orderController.proceedTopayment)
userRoute.get('/order',userAuth,orderController.getYourOrder)
userRoute.get('/orderDetails/:orderId',userAuth,orderController.retrieveOrderDetails)
userRoute.post('/orderCancel/:orderId',userAuth,orderController.orderCancel)
userRoute.post('/returnMessage/:orderId',userAuth,orderController.returnMessage)


userRoute.get('/Whishlish',userAuth,whishlistController.getWhishlist)
userRoute.post('/addWhishlistItem',userAuth,whishlistController.addWhishlistItem)
userRoute.delete('/wishlist/remove/:id', userAuth,whishlistController. removeProductFromWishlist);



userRoute.get('/userCoupons',userAuth,couponController.getuserCoupons)
userRoute.post('/applyCoupon',userAuth,couponController.applycoupon)
userRoute.post('/applyCoupon',userAuth,couponController.applycoupon)
userRoute.post('/removeCoupon',userAuth,couponController.removeCoupon)



userRoute.post('/paypalPayment',userAuth,paymentController.paypalPayment)
userRoute.get('/paymentseccuss',userAuth,paymentController.success)
userRoute.post('/paymentseccuss',userAuth,paymentController.paypalPayment)
userRoute.get('/paymentfail',userAuth,paymentController.paymentCancel)

//CouponManagement
userRoute.get("/userwallet",userAuth,walletController.loadWallet);
userRoute.post("/addMoneyThroughPaypal",userAuth,walletController.getPayPal);
userRoute.get("/walletSuccessPayPal",userAuth,walletController.successPayPal);
userRoute.get("/walletCancelPayPal",userAuth,walletController.cancelPayPal);
userRoute.get("/addMoneyToWallet",userAuth,walletController.addMoneyToWallet);

userRoute.post('/walletPayment',userAuth,walletController.processWalletPayment)










       



userRoute.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

userRoute.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), async (req, res) => {
    try {
        const user = req.user;

        const walletExists = await Wallet.findOne({ user: user._id });

        if (!walletExists) {
            const wallet = new Wallet({
                user: user._id,
                balance: 5000,
                transactions: [{
                    transaction_date: new Date(),
                    transaction_type: "Credit",
                    transaction_status: "Completed",
                    amount: 5000,
                }]
            });
            await wallet.save();
        }


    req.session.user = req.user; 
    res.redirect('/'); 
    } catch (error) {
        console.error('Error in Google login callback:', error);
        res.redirect('/login');     
    }
    
});

module.exports=userRoute;