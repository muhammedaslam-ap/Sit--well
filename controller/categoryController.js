const Category = require('../models/categorySchema');
const Product = require('../models/productSchema');
const product = require('../models/productSchema')



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
        const { name, description } = req.body;

        if (!name || !description) {
            req.flash('error', 'Both name and description are required.');
            return res.redirect('/admin/category');
        }

        if (!/^[a-zA-Z\s]+$/.test(name)) {
            req.flash('error', 'Category name should contain only letters and spaces.');
            return res.redirect('/admin/category');
        }

        const upperCaseName = name.toUpperCase().trim();

        const existCategory = await Category.findOne({ name: upperCaseName });
        if (existCategory) {
            req.flash('error', 'Category name already exists.');
            return res.redirect('/admin/category');
        }

        const newCategory = new Category({
            name: upperCaseName, 
            description: description.trim(),
        });

        await newCategory.save();

        req.flash('success', 'New Category Added.');
        return res.redirect('/admin/category');
    } catch (error) {
        console.error('Error adding category:', error);

        req.flash('error', 'An unexpected error occurred.');
        return res.redirect('/admin/category');
    }
};



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
         
        const upperCase  = categoryName.toUpperCase()

        const categoryExisting = await Category.findOne({ 
            name: upperCase, 
            _id: { $ne: id }  
        });

        if (categoryExisting) {
            req.flash('error', 'Category name already exists.');
             return res.redirect('/admin/category');
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: categoryName, description: description },
            { new: true }
        );

        if (updatedCategory) {
            req.flash('success', 'Category name updated.');
            res.redirect('/admin/category');  
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
}