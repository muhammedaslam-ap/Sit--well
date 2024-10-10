const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const product = require('../../models/productSchema')



const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('admin_category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('admin_error', {
            message: 'An error occurred while fetching categories.',
            errorCode: 500
        });
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body; // Use the correct field name here

        const existCategory = await Category.findOne({ name });

        if (existCategory) {
            return res.status(400).json({ error: "Category Already Exists" }); // Corrected typo in the error message
        }

        const newCategory = new Category({
            name,
            description, // Use the correct field name here
        });

        await newCategory.save();
        return res.json({ message: "Category added successfully" }); // Corrected typo in success message

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
};

// const addCategoryOffer = async (req,res)=>{
//     try {
//         const persentage = parseInt(req.body.persentage)
//         const categoryId = req.body.categoryId;
//         const category = await Category.findById(categoryId)
//         if(!category){
//             return res.status(500).json({status:false,message:"category not find"})
//         }
//         const product = await product.find({category:"category._id"})
//         const hasProductOffer = product.some((product) =>product.productOffer > persentage)
//         if(hasProductOffer){
//             return res.json({satus:false,message:"product whichin the category allready have product offer"})
//         }

//         await Category.updateOne({_id:categoryId},{$set:{categoryOffer:persentage}}) 

//         for(const product of products){
//             product.productOffer = 0
//             product.salePrice = product.regularPrice
//         }

//         await product.save()

//         res.json({status:true})

//     } catch (error) {
//         res.status(500).json({status:false,message:"internal server error"})
//     }
// }

// const removeCategoryOffer =async (req,res)=>{
//     try {
//         const categoryId = req.body.categoryId
//         const category = await Category.findOne(categoryId)
//         if(!category){
//             res.status(404).json({status:false,message:"category not found"})
//         }

//         const persentage = category.categoryOffer
//         const product = await Product.find({category:"category._id"})

//         if(product.length > 0){
//             for(const product of products){
//                 product.salePrice += Math.floor(Product.regularPrice*(persentage/100))
//                 product.productOffer = 0
//                 await product.save()

//             }
//         }
//          category.catagoryOffer = 0
//          await category.save()
//          res.json({status:true,message:"removed successfully"})

//     } catch (error) {
//         res.status(500).res.json({status:false,message:"internal server error"})
//     }
// }

const listCategory = async (req,res)=>{
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')
    } catch (error) {
        res.status(500).json({status:false,message:"internel server error"})
    }
}

const unlistCategory = async (req,res)=>{
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.status(500).json({status:false,message:"internel server error"})
    }
}

const editCategory = async (req,res)=>{
    try {
        const id = req.query.id
        const category =await Category.findOne({_id:id})
        res.render('edit_category',{category:category})

    } catch (error) {
        res.status(500).json({status:false,message:"internel server error"})

    }
}

const postEditCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

        // Check if another category with the same name already exists, excluding the current category
        const categoryExisting = await Category.findOne({ 
            name: categoryName, 
            _id: { $ne: id }  // Exclude the current category from the check
        });

        if (categoryExisting) {
            // Send a proper response if the category already exists
            return res.status(400).json({ error: "This category name already exists." });
        }

        // Update the category
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: categoryName, description: description },
            { new: true }
        );

        if (updatedCategory) {
            res.redirect('/admin/category');  // Redirect to category listing page
        } else {
            res.status(404).json({ error: "Category not found." });
        }
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

module.exports={
    categoryInfo,
    addCategory,
    listCategory,
    unlistCategory,
    editCategory,
    postEditCategory
    // addCategoryOffer,
    // removeCategoryOffer
}