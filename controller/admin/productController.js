const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const fs = require('fs')
const app =require('../../app')
const flash = require('connect-flash')
const path = require('path')
const multer = require('multer')
const sharp = require('sharp')

const getProductAddPage = async (req,res)=>{
    try {
        const category = await Category.find({isListed:true})
        res.render('product_add',{cat:category})
    } catch (error) {
        res.redirect('/pageerror')
    }
}



const addProduts = async (req, res) => {
    try {
      console.log(req.body); 
      console.log(req.files); // Log the uploaded files
  
      const {
        productName,
        regularPrice,
        salePrice,
        description,
        category,
        sizes,
      } = req.body;
  
      const productExists = await Product.findOne({ productName: productName });
  
      s
      if (!productExists) {
        const images = []; 
        
        
        if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
            const originalImagePath = req.files[i].path;
            const resizedImageFilename = `${Date.now()}-${req.files[i].filename}`; 
            const resizedImagePath = path.join(
              "public",
              "uploads",
              "product-images",
              resizedImageFilename
            );
  
            
            await sharp(originalImagePath)
              .resize({ width: 440, height: 440 })
              .toFile(resizedImagePath);
  
            images.push(resizedImageFilename); 
          }
        }
  
        
        const categoryObj = await Category.findOne({ name: category });
        const categoryId = categoryObj._id;
  
       
        const newProduct = new Product({
          productName: productName,
          regularPrice: regularPrice,
          salePrice: salePrice,
          description: description,
          productImage: images, 
          category: categoryId,
        });
  
        const result = await newProduct.save(); 
        console.log("Product added to database", result); 
        req.flash("success", "Product added");
        res.redirect("/admin/product");
      } else {
        req.flash("error", "Product already exists");
        res.redirect("/admin/product");
      }
    } catch (error) {
      console.log("Error while adding products", error.message);
      req.flash("error", "Error while adding product");
      res.redirect("/admin/product");
    }
  };
  
  
  module.exports = {
    getProductAddPage,
    addProduts,
  };
  