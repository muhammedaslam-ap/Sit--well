const Whishlist = require('../models/whishlistSchema')
const Product = require('../models/productSchema')
const User = require('../models/userSchema'); 
const mongoose = require ('mongoose')
const Cart = require('../models/cartSchema')


const getWhishlist = async (req, res) => {
    try {
        const userId = req.session.user._id;
        
        const wishlistData = await Whishlist.findOne({ userId })
            .populate({
                path: 'products.productId',
                select: 'productName productImage salePrice quantity' 
            });
        
        if (!wishlistData || !wishlistData.products || wishlistData.products.length === 0) {
            return res.status(404).render('whishlist', { 
                wishlist: { products: [] }, 
                user: req.session.user, 
                message: 'Wishlist not found' 
            });
        }

        const cartData = await Cart.findOne({ userId });

        const cartProductIds = cartData 
            ? cartData.items.map(cartItem => cartItem.productId.toString())
            : [];

        const wishlistWithCartStatus = wishlistData.products.map(wishlistProduct => ({
            ...wishlistProduct.toObject(),
            isInCart: cartProductIds.includes(wishlistProduct.productId._id.toString())
        }));

        const updatedWishlistData = {
            ...wishlistData.toObject(),
            products: wishlistWithCartStatus
        };

        res.render('whishlist', { 
            wishlist: updatedWishlistData, 
            user: req.session.user 
        });

    } catch (error) {
        console.error('Error retrieving wishlist:', error);
        res.status(500).render('whishlist', { 
            wishlist: { products: [] }, 
            user: req.session.user, 
            message: 'Internal server error' 
        });
    }
};




const addWhishlistItem = async (req, res) => {
    let productId;
    try {
        const userId = req.session.user._id;
        productId = req.body.productId;

        // Check if productId is valid
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            req.flash('error', 'Invalid product');
            return res.redirect(`/productDetails/${productId}`);
        }

        // Find product to check existence
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect(`/productDetails/${productId}`);
        }

        // Check if the product is already in the user's wishlist
        let whishlist = await Whishlist.findOne({ userId });
        if (whishlist) {
            const existingItem = whishlist.products.find(item => item.productId.toString() === productId);

            // If product is already in wishlist, flash a message and redirect
            if (existingItem) {
                req.flash('info', 'Product is already in your wishlist');
                return res.redirect(`/productDetails/${productId}`);
            }

            // Add the new product to the wishlist if it’s not already there
            whishlist.products.push({ productId });
        } else {
            // If the wishlist doesn't exist, create a new one with the product
            whishlist = new Whishlist({
                userId,
                products: [{ productId }]
            });
        }

        // Save the wishlist changes
        await whishlist.save();

        // Flash success message and redirect to product details page
        req.flash('success', 'Product successfully added to your wishlist');
        res.redirect(`/productDetails/${productId}`);

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        req.flash('error', 'An error occurred while adding to wishlist');
        res.redirect(`/productDetails/${productId || 'unknown'}`);
    }
};

const removeProductFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user._id; 
        const productId = req.params.id; 

        const updatedWishlist = await Whishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId } } }, 
            { new: true }
        );

        if (!updatedWishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        res.status(200).json({ message: 'Product removed from wishlist', wishlist: updatedWishlist });
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




module.exports={
    addWhishlistItem,
    getWhishlist,
    removeProductFromWishlist,
}






