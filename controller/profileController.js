const User = require('../models/userSchema')

const nodemailer = require('nodemailer')
const bcrypt  = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const { render } = require('ejs')



const securePassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false, // For self-signed certs; can be removed if not needed
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for Password Reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4></b>`, // Correct HTML closing tag
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error); // Log more informative error message
        return false; // Return false or throw error for better handling
    }
};


function generateOtp(){
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number

} 

const getForgotPassPage = async (req,res)=>{
    try {
        res.render('forgotpassword')
    } catch (error) {
        console.log(error)
    }
}


const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.render('forgotPassword', { message: "Please provide an email" });
        }

        const user = await User.findOne({ email: email });
        if (user) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.email = email; // Store email in session
                req.session.userOtp = otp;  // Optionally store OTP
                console.log("Stored email in session:", req.session.email);
                return res.render('forgotPass-otp'); // Render OTP verification page
            } else {
                return res.json({ success: false, message: "Failed to send OTP" });
            }
        } else {
            return res.render('forgotPassword', { message: "User not found" });
        }
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.redirect('/pageNotFound');
    }
};



const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp; // Get OTP from request body
        console.log("Entered OTP:", enteredOtp); // Log the entered OTP
        console.log("Stored OTP:", req.session.userOtp); // Log the stored OTP

        // Convert both OTPs to strings before comparing
        if (req.session.userOtp && enteredOtp === req.session.userOtp.toString()) {
            res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            res.json({ success: false, message: "OTP not matching" });
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};


const getResetPassPage = async (req,res)=>{
    try {
        res.render('reset-password')
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;

        const email = req.session.email;
        console.log("Resending OTP to email:", email); // Log the email

        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const emailSend = await sendVerificationEmail(email, otp); // Send email
        console.log("Email send status:", emailSend); // Log the status

        if (emailSend) { // Check if email sending was successful
            console.log("OTP resent successfully:", otp);
            res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            console.log("Failed to send OTP email");
            res.status(500).json({ success: false, message: "Failed to resend OTP" });
        }
    } catch (error) {
        console.error("Error during resendOtp:", error); // Log the actual error
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;

        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1);

            // Update the user's password in the database
            await User.updateOne({ email: email }, { $set: { password: passwordHash } });

            // Send a success response
            return res.status(200).json({ success: true, message: "Password updated successfully" });
        } else {
            // Send an error response if passwords don't match
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};




const getUserProfile = async (req, res) => {
    try {
        const { email, name } = req.session.user;
          // Extract name and email from session
      
        res.render('userProfile', { user:{name ,email}  });  // Render the profile page with user data
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).send('Error fetching account details.');
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user._id;

        if (!name || !email) {
            return res.status(400).send('Name and Email are required.');
        }

        const updateData = {
            name,
            email,
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (updatedUser) {
            // Update session with new user details
            req.session.user.name = updatedUser.name;
            req.session.user.email = updatedUser.email;

            // Render the profile page, but pass the updateSuccess flag as true
            return res.render('userProfile', {
                user: updatedUser,
                updateSuccess: true // Pass the success flag to the frontend
            });
        } else {
            return res.status(400).send('Profile update failed. No changes were made.');
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).send('Error updating profile.');
    }
};











module.exports = {

    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    getUserProfile,
    updateProfile,
 
}