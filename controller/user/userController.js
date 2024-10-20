const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Category = require("../../models/categorySchema");

const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt');
const { render } = require('ejs');



const pageNotFound = async(req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const landing = async(req,res)=>{
    try {
        const user = req.session.user
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},quantity:{$gte:0}
        })
        
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,10)

        if(user){
            const userData = await User.findOne({_id: user._id})
            return res.render('landing',{user:userData,products:productData,category:categories})
        }else{
            return res.render('landing',{products:productData,category:categories})

        }
    } catch (error) {
        console.log(error.message)
    }
}

const shop  = async(req,res)=>{
    try {
        const user = req.session.user
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},quantity:{$gte:0}
        })
        
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,10)

        if(user){
            const userData = await User.findOne({_id: user._id})
            return res.render('shop',{user:userData,products:productData,category:categories})
        }else{
            return res.render('shop',{products:productData,category:categories})

        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('login');  // Ensure correct user login view is rendered
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

// Handle User Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res.render('login', { message: "Please provide both email and password" });
        }

        // Find the user based on email
        const findUser = await User.findOne({ is_admin: false, email: email });

        // Check if the user exists
        if (!findUser) {
            return res.render('login', { message: "User Not Found" });
        }

        // Check if the user is blocked
        if (findUser.is_blocked) {
            return res.render('login', { message: "Admin Blocked You" });
        }

        // Ensure the password exists
        if (!findUser.password) {
            return res.render('login', { message: "Password not found for this user" });
        }

        // Compare provided password with the hashed password
        const passwordMatch = await bcrypt.compare(password, findUser.password);

        // If passwords don't match, send error
        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect Password" });
        }

        // If successful, store the user ID or object in session
        req.session.user = findUser._id;  // Ensure this aligns with your session config

        // Redirect to home or dashboard after successful login
        res.redirect('/');
    } catch (error) {
        console.error(error);

        // Render error message in case of any unexpected issues
        res.render('login', { message: "Login failed due to a system error." });
    }
};


const loadsignup = (req,res)=>{
    try {
        res.render('registration')
    } catch (error) {
        console.log(error)
    }
}

function genarateOtp(){
    return Math.floor(1000 + Math.random()*9000).toString()
}

async function sendVerificationEmail(email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port: 587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            },
            tls:{
                rejectUnauthorized:false
            },
        }) 

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"verify your account",
            text:`your OTP is ${otp}`,
            html:`<b>your OTP:${otp}</b>`
        })
        return info.accepted.length > 0

    } catch (error) {
        console.error('sending Email',error)
        return false

    }
}

const signup = async(req,res)=>{
 try {
    const {name,phone,email,password,cpassword} = req.body
    
        
        const findUser = await User.findOne({email})

        if(findUser){               
         return  res.render('registration',{message:"This Email already Existed"})
        }

         const otp=genarateOtp()
         const emailSend = await sendVerificationEmail(email,otp)
         if(!emailSend){
            return res.json('email error')
         }
         req.session.userOtp = otp
         req.session.userData = {name,phone,email,password}

         res.render('verify-otp')
         console.log(otp)
         
       

 } catch (error) {
    console.error(error);
    res.redirect('/pageNotFound')
    
 }
}

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        
        return passwordHash

    } catch (error) {
        
    }
}

const verifyotp = async (req, res) => {
    try {
        const { otp } = req.body;
        // console.log(otp);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;

           

            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: '/' });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again." });
        }

    } catch (error) {
       console.log('Error while verifiying the otp',error);
       res.status(500).json({success:false,message:'An error occured'});

    }
};

const resendOtp = async (req,res)=>{
    try {
        const {email} = req.session.userData
        if(!email) {
            return res.status(400).json({success:false, message:"email not found in session"})
        }
        const  otp = genarateOtp()
        req.session.userOtp = otp

        const emailSend = await sendVerificationEmail(email,otp)
        if(emailSend) {
            console.log("resend otp",otp )
            res.status(200).json({success:true, message:"OTP resend seccussfully"})
        }else {
            res.status(500).json({success:false, message:"failed to resend otp"})
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({seccuss:false, message:"internel server error"})
    }
}

const productDetails = async (req, res) => {
    try {       
        const user = req.session.user;

        const categories = await Category.find({ isListed: true });

        const productId = req.params.id; 

        const productData = await Product.findOne({
            _id: productId,
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gte: 0 }
        });

        if (!productData) {
            return res.status(404).redirect('/pageNotFound');
        }

        let userData;
        if (user) {
            userData = await User.findOne({ _id: user._id });
        }

        const productCategory = categories.find(category => category._id.equals(productData.category));

        return res.render('product_details', { 
            product: productData, 
            user: userData || null,
            category: productCategory,
            quantity: productData.quantity 
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Server error");
    }
}




module.exports={

    pageNotFound,
    landing,
    loadLogin,
    login,
    loadsignup,
    signup,
    verifyotp,
    resendOtp,
    productDetails,
    shop
}