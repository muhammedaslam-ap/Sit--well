const mongoose = require('mongoose');
const Cart = require('../models/cartSchema');
const Product = require('../models/productSchema');
const User = require('../models/userSchema');
const Address = require('../models/addressSchema');
const Coupon = require('../models/couponSchema')


const getAddToCart = async (req, res) => {
    try {
        const userId = req.session.user._id;

        const userData = await User.findOne({_id:userId})
        if (!req.session.user) {
            req.flash('error', 'You need to log in to access the cart');
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'productName productImage salePrice regularPrice'
            });

        if (!cart) {
            return res.render('cart', { 
                user: userData,
                cart: { items: [] },
                successMessage: req.flash('success'),
                errorMessage: req.flash('error')
            });
        }

        const cartData = {
            items: cart.items.map(item => {
                const productImage = Array.isArray(item.productId.productImage) && item.productId.productImage.length > 0
                    ? item.productId.productImage[0]
                    : 'placeholder.jpg'; 


                return {
                    productId: item.productId._id,
                    productName: item.productId.productName,
                    productImage: productImage,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice
                };
            })
        };

        res.render('cart', { 
            cart: cartData,
            user: userData,

           
        });
    } catch (error) {
        console.error("Error retrieving cart:", error);
        req.flash('error', 'An error occurred while retrieving the cart');
        res.redirect('/');
    }
};

//////////////////////////////////////////////////////////////////////////////////////

const addToCart = async (req, res) => {
    let productId;
    try {
        const userId = req.session.user._id;
        productId = req.body.productId;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            req.flash('error', 'Invalid product');
            return res.redirect(`/productDetails/${productId}`);
        }

        const quantityNum = parseInt(req.body.quantity) || 1;
        if (isNaN(quantityNum) || quantityNum < 1) {
            req.flash('error', 'Invalid quantity');
            return res.redirect(`/productDetails/${productId}`);
        }

        
       
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect(`/productDetails/${productId}`);
        }
        if(product.quantity === 0){
            req.flash('error','This product is OutOfStock!!')
            return res.redirect(`/productDetails/${productId}`)
        }

        const productPrice = parseFloat(product.salePrice || product.regularPrice);
        if (!productPrice || isNaN(productPrice)) {
            console.error('Invalid product price:', {
                productId,
                salePrice: product.salePrice,
                regularPrice: product.regularPrice,
            });
            req.flash('error', 'Invalid product price');
            return res.redirect(`/productDetails/${productId}`);
        }

        const productImage = product.productImage && product.productImage.length > 0
            ? product.productImage[0]
            : null;

        if (!productImage) {
            console.warn("No image available for product:", productId);
        }

        let cart = await Cart.findOne({ userId });
        const itemTotalPrice = productPrice * quantityNum;

        if (cart) {
            const itemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantityNum;
                cart.items[itemIndex].price = productPrice;
                cart.items[itemIndex].totalPrice += itemTotalPrice;

                cart.items[itemIndex].productImages = [productImage]; 
            } else {
                cart.items.push({
                    productId,
                    quantity: quantityNum,
                    price: productPrice,
                    totalPrice: itemTotalPrice,
                    productImages: [productImage]
                });
            }
        } else {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity: quantityNum,
                    price: productPrice,
                    totalPrice: itemTotalPrice,
                    productImages: [productImage]  
                }]
            });
        }

        await cart.save();

        req.flash('success', 'Product successfully added to cart');
        res.redirect(`/productDetails/${productId}`);
    } catch (error) {
        console.error("Error adding to cart:", error);
        req.flash('error', 'An error occurred while adding to cart');
        res.redirect(`/productDetails/${productId || 'unknown'}`);
    }
};




const addToCartFromWishlist = async (req, res) => {
    let productId;

    try {
        const userId = req.session.user._id;
        productId = req.body.productId;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            req.flash('error', 'Invalid product');
            return res.redirect(`/Whishlish`);
        }

        const quantityNum = parseInt(req.body.quantity) || 1;
        if (isNaN(quantityNum) || quantityNum < 1) {
            req.flash('error', 'Invalid quantity');
            return res.redirect(`/Whishlish`);
        }

        
       
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect(`/Whishlish`);
        }
        if(product.quantity === 0){
            req.flash('error','This product is OutOfStock!!')
            return res.redirect(`/Whishlish/`)
        }

        const productPrice = parseFloat(product.salePrice || product.regularPrice);
        if (!productPrice || isNaN(productPrice)) {
            console.error('Invalid product price:', {
                productId,
                salePrice: product.salePrice,
                regularPrice: product.regularPrice,
            });
            req.flash('error', 'Invalid product price');
            return res.redirect(`/Whishlish`);
        }

        const productImage = product.productImage && product.productImage.length > 0
            ? product.productImage[0]
            : null;

        if (!productImage) {
            console.warn("No image available for product:", productId);
        }

        let cart = await Cart.findOne({ userId });
        const itemTotalPrice = productPrice * quantityNum;

        if (cart) {
            const itemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantityNum;
                cart.items[itemIndex].price = productPrice;
                cart.items[itemIndex].totalPrice += itemTotalPrice;

                cart.items[itemIndex].productImages = [productImage]; 
            } else {
                cart.items.push({
                    productId,
                    quantity: quantityNum,
                    price: productPrice,
                    totalPrice: itemTotalPrice,
                    productImages: [productImage]
                });
            }
        } else {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity: quantityNum,
                    price: productPrice,
                    totalPrice: itemTotalPrice,
                    productImages: [productImage]  
                }]
            });
        }

        await cart.save();

        req.flash('success', 'Product successfully added to cart');
        res.redirect(`/Whishlish`);
    } catch (error) {
        console.error("Error adding to cart:", error);
        req.flash('error', 'An error occurred while adding to cart');
        res.redirect(`/Whishlish/${productId || 'unknown'}`);
    }
};


/////////////////////////////////////////////////////////////////////////////////////////


const removeCartProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.json({ success: false, message: 'Item not found in cart' });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        return res.json({ success: true, message: 'Item removed successfully' });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'An error occurred' });
        }
    }
};

////////////////////////////////////////////////////////////////////////////////////////////

const updateCartItemQuantity = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            req.flash('error', 'Item not found in cart');
            return res.redirect('/cart');
        }

        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 1) {
            req.flash('error', 'Invalid quantity');
            return res.redirect('/cart');
        }

        if (quantityNum > product.quantity) {
            return res.status(400).json({ error: 'Not enough stock available' });
        }

        cart.items[itemIndex].quantity = quantityNum;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * quantityNum;

        await cart.save();

        const cartTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        await updateProductQuantity(productId, -quantityNum + cart.items[itemIndex].quantity);

        res.json({
            quantity: cart.items[itemIndex].quantity,
            totalPrice: cart.items[itemIndex].totalPrice,
            cartTotal: cartTotal
        });
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
};

////////////////////////////////////////////////////////////////////////////////////////

const updateProductQuantity = async (productId, changeInQuantity) => {
    try {
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error("Product not found");
        }

        const newQuantity = product.quantity + changeInQuantity;

        if (newQuantity < 0) {
            throw new Error("Quantity cannot be less than zero");
        }
      
        product.quantity = newQuantity;
        await product.save();
    } catch (error) {
        console.error("Error updating product quantity:", error);
        throw error; 
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////

const getCheckOut = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const userCart = await Cart.findOne({ userId }).populate('items.productId');
        if (!userCart || userCart.items.length === 0) {
            req.flash('error', 'Your cart is empty. Please add items before proceeding to checkout.');
            return res.redirect('/cart');
        }

        for (let item of userCart.items) {
            const product = await Product.findById(item.productId._id);

            if (item.quantity > product.quantity) {
                req.flash('error', `Not enough stock for ${product.productName}. Available: ${product.quantity}`);
                return res.redirect('/cart'); 
            }
        }

        const userAddress = await Address.findOne({ userId });

        if (!userAddress || userAddress.address.length === 0) {
            req.flash('error', 'Please add an address before checkout.');
            return res.redirect('/cart');
        }




        const subtotal = userCart.items.reduce((total, item) => {
            return total + (item.totalPrice || 0); 
        }, 0);

        
        let isCoupon = false

        const appliedCoupon = req.session.coupon ? req.session.coupon.couponCode : null;

        let discount = 0;
        let couponMessage = null;
        
        if (appliedCoupon) {

            isCoupon = true
            // Use `findOne` to get a single coupon document
            const coupon = await Coupon.findOne({ couponCode: appliedCoupon, islist: true });
        
            // Check if coupon exists and the subtotal meets the minimum requirement
            if (coupon && subtotal >= coupon.minimumOffer) {
                discount = (subtotal * coupon.discount) / 100;
                couponMessage = `Coupon applied successfully! You saved $${discount.toFixed(2)} (${coupon.discount}%)`;
            } else if (coupon) {
                // If the coupon exists but subtotal is less than the required minimum
                couponMessage = `Subtotal must be at least $${coupon.minimumOffer} to apply this coupon.`;
            } else {
                // Coupon was not found or is inactive
                couponMessage = 'Invalid or inactive coupon code.';
            }
        }
        
        const newTotal = subtotal - discount;

        res.render('user/checkout', { 
            cart: userCart, 
            address: userAddress, 
            subtotal:subtotal, 
            discount, 
            couponMessage, 
            newTotal, 
            isCoupon,
            appliedCoupon  
        });

    } catch (error) {
        console.error('Error in getCheckout:', error);
        req.flash('error', "Unexpected error occurred. Please try again later.");
        res.redirect('/cart');
    }
};





module.exports = {
    addToCart,
    getAddToCart,
    updateCartItemQuantity,
    removeCartProduct,
    updateProductQuantity,
    getCheckOut,
    addToCartFromWishlist
};