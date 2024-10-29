const Product = require("../models/productSchema");
const Category = require("../models/categorySchema");
const mongoose = require('mongoose')
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { log } = require("console");


// Load the page to add products
const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true }); 
        res.render("product_add", {
            cat: category,
        });
    } catch (error) {
        console.error("Error loading add product page", error);
        res.redirect("/admin/pageerror");
    }
};

// Add a new product
const addProduct = async (req, res) => {
    try {
        const {productName,description,regularPrice,salePrice,quantity,color,category}= req.body;

        const productExists = await Product.findOne({
            productName: productName,
        });


        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
              for (let i = 0; i < req.files.length; i++) {
                  const originalImagePath = req.files[i].path;

                  const resizedImagePath = path.join('public', 'uploads', 'product-images', `resized-${req.files[i].filename}`);

                  await sharp(originalImagePath)
                      .resize({ width: 404, height: 440 }) 
                      .toFile(resizedImagePath); 

                  images.push(`resized-${req.files[i].filename}`);
              }
          }
          

            const categoryId = await Category.findOne({ name: category });
            if(categoryId){
                const newProduct = new Product({
                    productName: productName,
                    description: description,
                    // category:categoryId._id,
                    regularPrice: regularPrice,
                    color : color,
                    salePrice : salePrice,
                    createdOn: new Date(),
                    quantity: quantity,
                    productImage: images,
                    status: 'Available', 
                });
                await newProduct.save();
             
            req.flash('success','New Product Added')    
            return res.redirect("/admin/addProducts");
            } else {
                const newProduct = new Product({
                    productName: productName,
                    description: description,
                    regularPrice: regularPrice,
                    salePrice: salePrice,
                    createdOn: new Date(),
                    quantity: quantity,
                    color: color,
                    productImage: images,
                    status: 'Available', 
                });
                await newProduct.save();

            req.flash('success','New Product Added')    
            return res.redirect("/addProducts");
            }
            
        } else {
            req.flash('error','Product already exists, please try with another name')
            return res.redirect('/admin/addProducts');
        }
    } catch (error) {
        console.error("Error saving product", error);
        return res.redirect("/admin/page-error");
    }
};

const getAllProducts = async (req, res) => {
  try {
      const search = req.query.search || "";
      const page = parseInt(req.query.page) || 1;
      const limit = 4;

      const searchQuery = {
          productName: { $regex: new RegExp(search, "i") } 
      };

      const productData = await Product.find(searchQuery)
          .limit(limit)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .populate('category') 
          .exec();

      const count = await Product.countDocuments(searchQuery);

      const category = await Category.find({ isListed: true });
    
      if (category) {
          res.render("admin_products", {
              data: productData,
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              cat: category,
          });
      } else {
          res.render("admin/pageerror");
      }

  } catch (error) {
      console.error("Error fetching products:", error);
      res.redirect("/admin/pageerror");
  }
};

const blockProduct = async(req,res) => {
  try {
      let id = req.query.id;
      
      await Product.updateOne({_id:id},{$set:{isBlocked:true}});
      res.redirect("/admin/products");
  } catch (error) {
      console.error('Error blocking product:', error); 
      res.redirect("/admin/pageerror");
  }
}

const unblockProduct = async (req,res) => {
  try {
      let id = req.query.id;
      await Product.updateOne({_id:id},{$set:{isBlocked:false}});
      res.redirect("/admin/products");
  } catch (error) {
      console.error('Error unblocking product:', error); 
      res.redirect("/admin/pageerror");
  }
}


const getEditProduct = async (req,res) => {
    try {
        const id= req.query.id;
        const product =await Product.findOne({_id:id});
        const existingCategory = await Category.findOne({_id:product.category,isListed:true});
        const category = await Category.find({isListed:true});
        res.render("edit_products",{
            product:product,
            pcat:existingCategory,
            cat:category
        })
        
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}



const editProduct = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid product ID." });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        if (existingProduct) {
            req.flash('error','Product name already exists. Please try another name')
            return res.redirect('/admin/editProduct')
        }

        let categoryId;
        if (mongoose.Types.ObjectId.isValid(data.category)) {
            categoryId = mongoose.Types.ObjectId(data.category);
        } else {
            const categoryDoc = await Category.findOne({ name: data.category });
            if (!categoryDoc) {
                req.flash('error','Invalid category name provided.')
                return res.redirect('/admin/editProduct')
            }
            categoryId = categoryDoc._id;
        }

        // Handle image upload
        const images = req.files ? req.files.map(file => file.filename) : [];

        // Update fields
        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: categoryId, // use the ObjectId for category
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color
        };

        // Replace product images if new images are uploaded
        if (images.length > 0) {
            updateFields.productImage = images;
        }

        // Update product in database
        const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });
        if (!updatedProduct) {
            req.flash('error','Failed to update product.')
            res.redirect("/admin/editProduct");
        }
         req.flash('success','product updated successfully')
         res.redirect("/admin/products");

    } catch (error) {
        console.error("Error updating product:", error.message);
        res.redirect("/admin/pageerror");
    }
};




const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdServer } = req.body;

        await Product.findByIdAndUpdate(productIdServer, {
            $pull: { productImage: imageNameToServer }
        });

        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
       ` 
        Check if the image exists and then delete it`
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
        }

        res.send({ status: true });

    } catch (error) {
        console.error("Error deleting image:", error.message);
        res.redirect("/admin/pageerror");
    }
};



module.exports = {
    getProductAddPage,
    addProduct,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
};