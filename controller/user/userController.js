const User = require('../../models/userSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')

// const home = async(req,res)=>{
//     try {
//         res.render('home')
//     } catch (error) {
//         console.log(error)
//     }
// }

const pageNotFound = async(req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const landing = async(req,res)=>{
    try {
        res.render('landing')
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

        if (!email || !password) {
            return res.render('login', { message: "Please provide both email and password" });
        }

        const findUser = await User.findOne({ is_admin: false, email: email });

        if (!findUser) {
            return res.render('login', { message: "User Not Found" });
        }

        if (findUser.is_blocked) {
            return res.render('login', { message: "Admin Blocked You" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect Password" });
        }

        req.session.user = findUser.id;  // Use distinct session key for users
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('login', { message: "Login failed" });
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

const resendOtp=async (req,res)=>{
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


module.exports={
    // home,
    pageNotFound,
    landing,
    loadLogin,
    login,
    loadsignup,
    signup,
    verifyotp,
    resendOtp
}