const User = require('../models/userSchema')


const userAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            // Fetch the user by their session ID
            const user = await User.findById(req.session.user);

            // Check if the user exists and is not blocked
            if (user && !user.is_blocked) {
                return next(); // Proceed to the next middleware or route handler
            } else {
                return res.redirect('/login'); // Redirect if the user is blocked or doesn't exist
            }
        } else {
            return res.redirect('/login'); // Redirect if no user is in session
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).send("Internal server error"); // Handle server errors
    }
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        next(); // If admin session exists, proceed to the requested route
    } else {
        res.redirect('/admin/login'); // If no session, redirect to login
    }
};


module.exports={
    userAuth,
    adminAuth
}