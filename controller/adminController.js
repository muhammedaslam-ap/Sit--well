const User = require('../models/userSchema');
const bcrypt = require('bcrypt');

// Load Admin Login Page
const loadlogin = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }
        res.render('admin_login', { message: null });  
    } catch (error) {
        console.error(error);
        res.redirect('/pageError');
    }
};

// Handle Admin Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email: email, is_admin: true });

        if (admin) { 
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = {
                    id: admin._id, 
                    email: admin.email,
                };

                return res.redirect('/admin/dashboard');
            } else {
                return res.render('admin_login', { message: 'Incorrect password' });
            }
        } else {
            return res.render('admin_login', { message: 'Admin not found' });
        }
    } catch (error) {
        console.error("Error during admin login:", error);
        res.redirect('/pageError');
    }
};


// Load Admin Dashboard
const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.render('admin_dashboard');
        } else {
            return res.redirect('/admin/adminlogin');
        }
    } catch (error) {
        console.error(error);
        return res.redirect('/pageNotFound');
    }
};

const pageError = async (req,res)=>{
    res.render('admin_error')
}
const logout = async (req,res)=>{
   try {

    req.session.destroy(error => {
        if(error){
            console.error(error)
            return res.redirect('/admin/pageerror')
        }
        res.redirect('/admin/login')
    })
   } catch (error) {

    console.error(error)
    return res.redirect("/admin/pageError")

   } 
}

module.exports = {
    loadlogin,
    login,
    loadDashboard,
    pageError,
    logout
};
