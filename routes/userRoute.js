const express=require('express')
const userRoute = express()
const passport=require('passport')


userRoute.set('view engine','ejs')
userRoute.set('views','./views/user')

const userController=require('../controller/user/userController') 

userRoute.get('/pageNotFound',userController.pageNotFound)
userRoute.get('/',userController.landing)
userRoute.get('/login',userController.loadLogin)
userRoute.post('/login',userController.login)
userRoute.get('/signup',userController.loadsignup)
userRoute.post('/signup',userController.signup)
userRoute.post('/verify-otp',userController.verifyotp);
userRoute.post('/resend-otp',userController.resendOtp)

userRoute.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
userRoute.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

module.exports=userRoute;