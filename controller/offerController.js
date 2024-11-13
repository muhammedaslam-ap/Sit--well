const Category = require('../models/categorySchema')
const Offer = require('../models/offerSchema')
const Product = require('../models/productSchema')



const getAddOffer = async (req,res) =>{
    try {

        const product = await Product.find()
        const category = await Category.find()
        res.render('admin_addOffer',{product,category})

    } catch (error) {
        console.error('the error find in getting addofferpage',error)
        res,redirect('admin/pageerror')
    }
}



const addOffer = async (req, res) => {
    try {
        const { offerType, productName, categoryName, offerDescription, discountPercentage, price, validUntil } = req.body;

        console.log("Request body:", req.body);

        if (!offerType || !discountPercentage || !validUntil) {
            req.flash('error', 'Required fields are missing');
            return res.redirect('/admin/addOffer');
        }

        if (offerType === 'product') {
            if (Array.isArray(productName)) {
                req.flash('error', 'Only one product can be selected for product offers');
                return res.redirect('/admin/addOffer');
            }
        }

        if (offerType === 'category' && !categoryName) {
            req.flash('error', 'Category name is required for category offers');
            return res.redirect('/admin/addOffer');
        }

        const startDate = new Date();
        const endDate = new Date(validUntil);

        const newOfferData = {
            offerType,
            productName: offerType === 'product' ? productName : undefined,
            categoryName: offerType === 'category' ? categoryName : undefined,
            offerDescription,
            discountPercentage,
            price,
            startDate,
            endDate,
        };


        if (offerType === 'product') {
            newOfferData.productName = productName;
        
            const product = await Product.findById(productName);
            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/admin/addOffer');
            }

            const salePrice = product.regularPrice * (1 - discountPercentage / 100);
            const offerPrice = product.salePrice - salePrice        

        
            await Product.findByIdAndUpdate(
                productName,
                {
                    productOffer: discountPercentage,
                    offerPrice:offerPrice,
                    salePrice: salePrice,
                },
                { new: true }
            );
        
        } else if (offerType === 'category') {
            newOfferData.categoryName = categoryName;
        
            const discountFactor = 1 - discountPercentage / 100;
        
            const category = await Category.findById(categoryName);
            if (!category) {
                req.flash('error', 'Category not found');
                return res.redirect('/admin/addOffer');
            }
        
            await Product.updateMany(
                { category: categoryName },
                [
                    {
                        $set: {
                            categoryOffer: discountPercentage,
                            salePrice: {
                                $cond: {
                                    if: {
                                        $or: [
                                            { $eq: ["$productOffer", null] },
                                            { $lt: ["$productOffer", discountPercentage] }
                                        ]
                                    },
                                    then: { $multiply: ["$regularPrice", discountFactor] }, 
                                    else: { $multiply: ["$regularPrice", 1 - "$productOffer" / 100] } 
                                }
                            }
                        }
                    }
                ]
            );
        
            await Category.findByIdAndUpdate(
                categoryName,
                {
                    categoryOffer: discountPercentage,
                },
                { new: true }
            );
        }
        
        const newOffer = new Offer(newOfferData);
        await newOffer.save();
        
        req.flash('success', 'Offer added successfully');
        res.redirect('/admin/addOffer');
        console.log(newOffer)
    } catch (error) {
        console.error("Error adding offer:", error);
        req.flash('error', error.message || 'An error occurred while creating the offer');
        res.redirect('/admin/addOffer');
    }
};



module.exports = {
    getAddOffer,
    addOffer
}