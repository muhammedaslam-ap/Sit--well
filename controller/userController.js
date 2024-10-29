const User = require('../models/userSchema')
const Product = require('../models/productSchema')
const Category = require("../models/categorySchema");
const Cart = require('../models/cartSchema')
const mongoose = require('mongoose')

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

const landing = async (req, res) => {
    try {
        const user = req.session.user;

        const categories = await Category.find({ isListed: true });
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) }
        })
        .sort({ createdOn: -1 }) 
        .limit(8); 

        const successMessage = req.flash('success'); 
        const errorMessage = req.flash('error'); 


        if (user) {
            const userData = await User.findOne({ _id: user._id, is_blocked: false });
            
            if (userData) {
                return res.render("landing", {
                    user: userData,
                    products: productData,
                    category: categories,
                    successMessage: successMessage, 
                    errorMessage: errorMessage
                });
            } else {
                delete req.session.user; 
                return res.render("landing", {
                    products: productData,
                    category: categories,
                    successMessage: successMessage, 
                    errorMessage: errorMessage
                });
            }
        } else {
            return res.render("landing", {
                products: productData,
                category: categories,
                successMessage: successMessage, 
                errorMessage: errorMessage
            });
        }
    } catch (error) {
        console.error("Error fetching landing page:", error.message); 
        res.status(500).render('errorPage', { message: "Something went wrong" }); 
    }
};


const userLogout = async (req,res)=>{
        try {
            req.session.destroy((err)=>{
                if(err){
                    console.log(err)
                    return res.redirect('/pageNotFound')
                }
                return res.redirect('/login')
            })
           
        } catch (error) {
            console.log(error)
            return res.redirect('/pageNotFound')
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
            return res.render('login');  
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('login', { message: "Please provide both email and password." });
        }

        const findUser = await User.findOne({ is_admin: false, email: email });

        if (!findUser) {
            return res.render('login', { message: "User not found." });
        }

        if (findUser.is_blocked) {
            return res.render('login', { message: "Your account has been blocked by the admin." });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect password." });
        }

        req.session.user = {
            _id: findUser._id,
            name: findUser.name,
            email: findUser.email
        };

        res.redirect('/');
    } catch (error) {
        console.error("Login Error:", error);
        return res.render('login', { message: "Login failed due to a system error." });
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
        const productId = req.params.id;

        // Validate productId before querying
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            // console.log("Invalid Product ID format:", productId);
            return res.status(400).redirect('/pageNotFound');
        }

        const [categories, productData] = await Promise.all([
            Category.find({ isListed: true }).lean(),
            Product.findOne({
                _id: productId,
                isBlocked: false,
                quantity: { $gte: 0 }
            }).lean()
        ]);

        // console.log("Fetched Categories:", categories);
        // console.log("Fetched Product Data:", productData);

        if (!productData) {
            return res.status(404).redirect('/pageNotFound');
        }

        const productCategory = categories.find(category => category._id.equals(productData.category));

        if (!productCategory) {
            console.log("Product category not found in listed categories");
            return res.status(404).render('no_recommendations', { category: null });
        }

        const [userData, recommendedProducts] = await Promise.all([
            user ? User.findOne({ _id: user._id }).lean() : null,
            Product.find({
                category: productData.category,
                _id: { $ne: productId },
                isBlocked: false
            })
            .select('productName productImage regularPrice salePrice quantity')
            .limit(4)
            .lean()
        ]);

        // console.log("Recommended Products:", recommendedProducts);

        return res.render('product_details', {
            product: productData,
            user: userData || null,
            category: productCategory,
            quantity: productData.quantity,
            recommendedProducts: recommendedProducts.length ? recommendedProducts : [],
            message: recommendedProducts.length ? null : "No recommendations available."
        });
    } catch (error) {
        console.error('Product Details Error:', error);
        return res.status(500).send("Server error");
    }
};



///costomerController

const costomerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        let limit = 3;

      
        const userData = await User.find({
            is_admin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } }, 
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ],
        })
        .limit(limit) 
        .sort({createdOn:-1})
        .skip((page - 1) * limit)
        .exec();

     
        const count = await User.countDocuments({
            is_admin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ],
        });

      
        const totalPages = Math.ceil(count / limit);

 
        res.render("admin_costomers", {
            data: userData,      
            currentPage: page,  
            totalPages: totalPages,
            search: search        
        });
    } catch (error) {
        console.error("Error fetching customer data:", error);
        res.status(500).send("Internal Server Error");
    }
};


const  costomerBlocked = async (req,res)=>{
    try {
        id = req.query.id
        await User.updateOne({_id:id},{$set:{is_blocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}


const costomerUnblocked = async (req,res)=>{
    try {
        id = req.query.id
        await User.updateOne({_id:id},{$set:{is_blocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}







module.exports={
    //addminCostomerside
    costomerInfo,
    costomerUnblocked,
    costomerBlocked,

    //userside
    pageNotFound,
    landing,
    loadLogin,
    login,
    loadsignup,
    signup,
    verifyotp,
    resendOtp,
    productDetails,
    shop,
    userLogout
}