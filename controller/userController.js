const User = require('../models/userSchema')
const Product = require('../models/productSchema')
const Category = require("../models/categorySchema");
const Cart = require('../models/cartSchema')
const mongoose = require('mongoose')
const Wallet =  require('../models/walletSchema')

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
        const categories = await Category.find({ isListed: true }); // Only fetch listed categories
        const { search, sort, stock, category } = req.query;

        let sortCriteria = { createdOn: -1 };

        switch (sort) {
            case 'popularity':
                sortCriteria = { popularity: -1 };
                break;
            case 'priceLowHigh':
                sortCriteria = { salePrice: 1 };
                break;
            case 'priceHighLow':
                sortCriteria = { salePrice: -1 };
                break;
            case 'aToZ':
                sortCriteria = { productName: 1 };
                break;
            case 'zToA':
                sortCriteria = { productName: -1 };
                break;
        }

        let stockFilter = {};
        if (stock === 'inStock') {
            stockFilter = { quantity: { $gt: 0 } };
        } else if (stock === 'outOfStock') {
            stockFilter = { quantity: 0 };
        }

        let categoryFilter = {};
        if (category && category !== 'all') {
            categoryFilter = { category: category };
        }

        const filter = {};

        if (search) {
            filter.productName = { $regex: `^${search}`, $options: 'i' };
        }

        let productData = await Product.find({
            isBlocked: false,
            ...stockFilter,
            ...categoryFilter,
            ...filter,
        })
        .populate('category') // Populate the category field with the category details
        .sort(sortCriteria)
        .limit(10) // Apply sorting before using `.then()`

        productData = productData.filter(product => product.category && product.category.isListed);

        // if(req.user){
        //     const googleUser = req.user;
        //     if (googleUser.is_blocked) {             
        //         req.flash('error', 'This account has been blocked by the admin.'); 
        //         return res.redirect('/logout');
        //     }
        // }
        
        if (user) {
            const userData = await User.findOne({ _id: user._id, is_blocked: false });
  
            
            if (userData) {
                
                return res.render("landing", {
                    user: userData,
                    products: productData,
                    category: categories,
                    sortOption: sort,
                    stockOption: stock,
                    selectedCategory: category,
                    searchQuery: search
                });
            } else {
                
                delete req.session.user;
                return res.render("landing", {
                    products: productData,
                    category: categories,
                    sortOption: sort,
                    stockOption: stock,
                    selectedCategory: category,
                    searchQuery: search
                });
            }
        } else {
            return res.render("landing", {
                products: productData,
                category: categories,
                sortOption: sort,
                stockOption: stock,
                selectedCategory: category,
                searchQuery: search
            });
        }
    } catch (error) {
        console.error("Error fetching landing page:", error.message);
        res.status(500).render('errorPage', { message: "Something went wrong" }); 
    }
};


const userLogout = async (req,res)=>{
        try {
            if(req.session.user) {
                delete req.session.user
                return res.redirect('/login')
            }
            return res.redirect('/login')
        } catch (error) {
            console.log(error)
            return res.redirect('/pageNotFound')
        }
}

const shop = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true }); // Only fetch listed categories
        const { search, sort, stock, category } = req.query;

        let sortCriteria = { createdOn: -1 };

        switch (sort) {
            case 'popularity':
                sortCriteria = { popularity: -1 };
                break;
            case 'priceLowHigh':
                sortCriteria = { salePrice: 1 };
                break;
            case 'priceHighLow':
                sortCriteria = { salePrice: -1 };
                break;
            case 'aToZ':
                sortCriteria = { productName: 1 };
                break;
            case 'zToA':
                sortCriteria = { productName: -1 };
                break;
        }

        let stockFilter = {};
        if (stock === 'inStock') {
            stockFilter = { quantity: { $gt: 0 } };
        } else if (stock === 'outOfStock') {
            stockFilter = { quantity: 0 };
        }

        let categoryFilter = {};
        if (category && category !== 'all') {
            categoryFilter = { category: category };
        }

        const filter = {};

        if (search) {
            filter.productName = { $regex: `^${search}`, $options: 'i' }; // Case insensitive search
        }

        let productData = await Product.find({
            isBlocked: false,
            ...stockFilter,
            ...categoryFilter,
            ...filter,
        })
        .populate('category') 
        .sort(sortCriteria); 

        productData = productData.filter(product => product.category && product.category.isListed);

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
        productData = productData.slice(0, 100); 

        if (user) {
            const userData = await User.findOne({ _id: user._id, is_blocked: false });

            if (userData) {
                return res.render('shop', {
                    user: userData,
                    products: productData,
                    category: categories,
                    sortOption: sort,
                    stockOption: stock,
                    selectedCategory: category,
                    searchQuery: search
                });
            } else {
                delete req.session.user;
                return res.render('shop', {
                    products: productData,
                    category: categories,
                    sortOption: sort,
                    stockOption: stock,
                    selectedCategory: category,
                    searchQuery: search
                });
            }
        } else {
            return res.render('shop', {
                products: productData,
                category: categories,
                sortOption: sort,
                stockOption: stock,
                selectedCategory: category,
                searchQuery: search
            });
        }
    } catch (error) {
        console.error("Error fetching shop page:", error.message);
        res.status(500).render('errorPage', { message: "Something went wrong" });
    }
};


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

        req.session.user = await { 
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

            const initialWalletBalance = 5000;
            const newWallet = new Wallet({
                user: saveUserData._id,
                balance: initialWalletBalance,
                transactions: [
                    {
                        transaction_date: Date.now(),
                        transaction_type: "Credit",
                        transaction_status: "Completed",
                        amount: initialWalletBalance,
                        description: "Initial wallet credit for new user signup."
                    }
                ]
            });

            await newWallet.save();
            console.log(`Wallet created for user ${saveUserData._id} with balance ${initialWalletBalance}`);

            req.session.user = saveUserData; 
            res.json({ success: true, redirectUrl: '/' });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again." });
        }

    } catch (error) {
        console.error('Error while verifying the OTP:', error);
        res.status(500).json({ success: false, message: 'An error occurred while processing your request.' });
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

        const products = await Product.findById(productId)
        let isInCart
        if(user){
            const cartItem = await Cart.findOne({ userId:user._id, 'items.productId': productId });
             isInCart = cartItem ? cartItem:false;
        }
       
        
        if (!mongoose.Types.ObjectId.isValid(productId)) {
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

   
        if (!productData) {
            return res.status(404).redirect('/pageNotFound');
        }

        const productCategory = categories.find(category => category._id.equals(productData.category));

        if (!productCategory) {
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


        return res.render('product_details', {
            product: productData,
            user: userData || null,
            category: productCategory,
            quantity: productData.quantity,
            products, 
            isInCart:isInCart?isInCart:false,
            recommendedProducts: recommendedProducts.length ? recommendedProducts : [],
            message: recommendedProducts.length ? null : "No recommendations available."
        });
    } catch (error) {
        console.error('Product Details Error:', error);
        return res.status(500).send("Server error");
    }
};


const getAboutPage =  async(req,res)=>{
    try {
        const user  = req.session.user       
        
        res.render('aboutPage',{user})
    } catch (error) {
        console.error(error)
    }
}

const getContactPage =  async(req,res)=>{
    try {
        const user  = req.session.user       
        
        res.render('contact',{user})
    } catch (error) {
        console.error(error)
    }
}



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
    userLogout,
    getAboutPage,
    getContactPage
}