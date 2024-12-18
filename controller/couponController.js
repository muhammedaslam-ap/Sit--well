const Coupon  = require('../models/couponSchema')


const getCoupon = async(req,res)=>{
    try {
        
        res.render('admin_createCoupon')

    } catch (error) {
        console.error('error foind at while geting cuopon page',error)
        res.redirect('/admin/pageerror')
    }
}



const createCoupon = async (req, res) => {
    try {
        const { name, couponCode, expireOn, discount, minimumOffer, limit, islist } = req.body;
           console.log(req.body)
        if (!name || !couponCode || !expireOn || !discount || !minimumOffer || !limit) {
            req.flash('error', 'All fields are required');
            return res.status(400).redirect('/admin/coupon');
        }
        

        const newCoupon = new Coupon({
            name,
            couponCode,
            expireOn: new Date(expireOn),
            discount,
            minimumOffer,
            limit,
            isListed: islist
        });

        await newCoupon.save();
        console.log(newCoupon)
        req.flash('success', 'Coupon created successfully');
        res.status(201).redirect('/admin/coupon');
    } catch (error) {
        console.error('Error creating coupon:', error.message);
        req.flash('error', 'faild to add');
        res.status(201).redirect('/admin/coupon');
    }
};


const couponMenagent = async (req,res)=>{
    try {      

        const coupon = await Coupon.find()
        res.render('admin_couponMenagement',{coupon})

    } catch (error) {
        console.error('error occured  getting coupon menagement')
        res.redirect('/admin/pageerror')
    }
}

const couponListing = async (req,res)=>{
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        coupon.islist = !coupon.islist;
        await coupon.save();

        res.json({ success: true, islist: coupon.islist });
    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
}


const getuserCoupons = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const coupons = await Coupon.find({ islist: true }).populate('user.userId');

        if (!coupons) {
            console.error('No coupons found');
            return res.render('userCoupons', { coupons: [], userId });
        }

        res.render('userCoupons', { coupons, userId }); 
    } catch (error) {
        console.error('Error fetching coupons for user:', error);
        res.redirect('/pageNotFound');
    }
};

const applycoupon = async (req, res) => {
    const { couponCode }= req.body;
    const userId = req.session.user._id
    console.log(couponCode)
    const coupon = await Coupon.findOne({ couponCode: couponCode, islist: true });
    if (coupon && new Date() <= coupon.expireOn) {

        let userEntry = coupon.user.find(entry => entry.userId.toString() === userId.toString());

        if (userEntry) {
            if (userEntry.couponLimit >= coupon.limit) {
                req.flash('error', 'You have reached the usage limit for this coupon');
                return res.redirect('/checkout');
            } else {
                userEntry.couponLimit += 1;
            }
        } else {
            coupon.user.push({ userId: userId, couponLimit: 1 });
        }

        await coupon.save();

        req.session.coupon = coupon;  
        req.flash('success', `Coupon applied: ${coupon.discount}% off!`);
        res.redirect('/checkout');



    } else {
        req.flash('error', 'Invalid or expired coupon');
        res.redirect('/checkout');
    }
};

const removeCoupon = async (req, res) => {
    req.session.coupon = null; 
    res.redirect('/checkout'); 
};







module.exports = {
    getCoupon,
    createCoupon,
    couponMenagent,
    couponListing,
    getuserCoupons,
    applycoupon,
    removeCoupon
}