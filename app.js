 const express = require('express')
 const app = express()
 const path = require('path')
 const env = require('dotenv').config()
 const flash = require('connect-flash')
 const userRoute = require('./routes/userRoute')
 const adminRoute = require('./routes/adminRoute')
 const session = require('express-session')
 const db = require('./configaration/db')
 const passport = require('./configaration/passport')
 db();
 
 
 app.use(express.json()); 
 app.use(express.urlencoded({ extended: true })); 
 app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
 }))



 app.use(passport.initialize())
 app.use(passport.session());
 
 app.use(flash());

 // Middleware to set flash messages in local variables
 app.use((req, res, next) => {
     res.locals.success_msg = req.flash('success');
     res.locals.error_msg = req.flash('error');
     next();
 });

 app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
 })


 

 app.set('view engine','ejs')
 app.set('views', [
   path.join(__dirname, '/views/user'),
   path.join(__dirname,'/views/partials/user'),
   path.join(__dirname,'/views/partials/admin'),
   path.join(__dirname, '/views/admin')
 ]);
 app.use(express.static(path.join(__dirname, 'public')));


 app.use('/',userRoute) 
 app.use('/admin',adminRoute) 

 


 app.listen(process.env.PORT,()=>{console.log(`server is running on 3000`)})

 module.exports = app
