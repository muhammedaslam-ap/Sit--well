const User = require('../models/userSchema')


const userAuth = async (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.is_blocked){
                next()
            }else{
                res.redirect('/login')
            }
        }).catch(error=>{
            console.error(error)
            res.status(500).send("internal server error")
        })
    }else{
        res.redirect('/login')
    }
}

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