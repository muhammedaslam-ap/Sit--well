const Category = require('../models/categorySchema')
const Offer = require('../models/offerSchema')
const Product = require('../models/productSchema')



const getAddOffer = async (req,res) =>{
    try {

        const product = await Product.find()
        const category = await Category.find()
        const offers = await Offer.find()  .populate({
            path: 'productName',  
            select: 'productName'
          })
          .populate({
            path: 'categoryName', 
            select: 'name'        
          });
        res.render('admin_addOffer',{product,category,offers})

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
            console.log('hy');
            
            const product = await Product.findById(productName);
            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/admin/addOffer');
            }

           if(product.productOffer<discountPercentage){
            const effectiveDiscount = Math.max(discountPercentage, product.productOffer);
            
            const salePrice = product.regularPrice * (1 - effectiveDiscount / 100);
            const offerPrice = product.regularPrice - salePrice;
            await Product.findByIdAndUpdate(
                productName,
                {
                    productOffer: effectiveDiscount,
                    salePrice,
                    offerPrice,
                },
                { new: true }
            );
           }
          



            // Calculate salePrice and offerPrice based on the effective discount

            // Update the product with the highest discount
           

        // ** If offerType is category **
        } else if (offerType === 'category') {
            const category = await Category.findById(categoryName);
            console.log("1",category)
            if (!category) {
                req.flash('error', 'Category not found');
                return res.redirect('/admin/addOffer');
            }

            // Update all products in the category with the highest discount

            const newProduct = await Product.find({category:category._id})


            console.log('2',newProduct)
            for(let item of newProduct){
                if(item.productOffer < discountPercentage){
                    console.log('3',item)
                    const effectiveDiscount = Math.max(discountPercentage, item.productOffer);
                    const salesPrice = item.regularPrice * (1 - effectiveDiscount / 100);
                    const offerPrice = item.regularPrice - salesPrice;
                    await Product.updateOne({_id:item._id},{productOffer:discountPercentage, salePrice: salesPrice,offerPrice:offerPrice})
                }
            }

           
        }

        // Save the offer in the Offer model
        const newOffer = new Offer(newOfferData);
        await newOffer.save();

        req.flash('success', 'Offer added successfully');
        res.redirect('/admin/addOffer');
        console.log("New offer created:", newOffer);
    } catch (error) {
        console.error("Error adding offer:", error);
        req.flash('error', error.message || 'An error occurred while creating the offer');
        res.redirect('/admin/addOffer');
    }
};


const deleteAddOffer = async (req, res) => {
    try {
      const offerId  = req.query.offerId;
      console.log(offerId)

  
      // Find the offer to delete
      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
  
      const { offerType, productName, categoryName, discountPercentage } = offer;
  
      // Delete the offer
      await Offer.findByIdAndDelete(offerId);
  
      if (offerType === 'product' && productName) {
        const product = await Product.findById(productName);
  
        // Find next highest offer for this product
        const otherOffers = await Offer.find({ offerType: 'product', productName })
          .sort({ discountPercentage: -1 });
        const nextDiscount = otherOffers.length ? otherOffers[0].discountPercentage : 0;
  
        // Update the product with new discount values
        if (product) {
          const effectiveDiscount = Math.max(nextDiscount, 0);
          const salePrice = product.regularPrice * (1 - effectiveDiscount / 100);
          const offerPrice = product.regularPrice - salePrice;
          
          await Product.findByIdAndUpdate(
            productName,
            { productOffer: effectiveDiscount, salePrice, offerPrice },
            { new: true }
          );
        }
      } else if (offerType === 'category' && categoryName) {
        const otherCategoryOffers = await Offer.find({ offerType: 'category', categoryName })
          .sort({ discountPercentage: -1 });
        const nextCategoryDiscount = otherCategoryOffers.length ? otherCategoryOffers[0].discountPercentage : 0;
  
        // Update products in the category
        const categoryProducts = await Product.find({ category: categoryName });
        for (let product of categoryProducts) {
          const effectiveDiscount = Math.max(nextCategoryDiscount, 0);
          const salePrice = product.regularPrice * (1 - effectiveDiscount / 100);
          const offerPrice = product.regularPrice - salePrice;
  
          await Product.findByIdAndUpdate(
            product._id,
            { productOffer: effectiveDiscount, salePrice, offerPrice },
            { new: true }
          );
        }
      }
  
      res.status(200).json({ message: 'Offer deleted successfully' });
    } catch (error) {
      console.error('Error deleting offer:', error);
      res.status(500).json({ message: 'An error occurred while deleting the offer' });
    }
  };
  
  // Express route to connect with the deleteOffer function
  



module.exports = {
    getAddOffer,
    addOffer,
    deleteAddOffer
}