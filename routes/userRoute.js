const express=require('express')
const userRoute=express()

userRoute.set('view engine','ejs')
userRoute.set('views','./views/user')
const userController=require('../controller/userController') 

userRoute.get('/',userController.landing)
userRoute.get('/login',userController.login)
userRoute.get('/register',userController.register)

module.exports=userRoute