const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { log } = require("console");

// Load the page to add products
const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true }); // Only show listed categories
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

        // Check if the product already exists
        const productExists = await Product.findOne({
            productName: productName,
        });


        if (!productExists) {
            const images = [];

            // Handle image uploads and resizing
            if (req.files && req.files.length > 0) {
              for (let i = 0; i < req.files.length; i++) {
                  const originalImagePath = req.files[i].path;
          
                  // Resized image destination path with 'resized-' prefix to avoid conflicts
                  const resizedImagePath = path.join('public', 'uploads', 'product-images', `resized-${req.files[i].filename}`);
          
                  // Resize the image using Sharp and save to the new destination path
                  await sharp(originalImagePath)
                      .resize({ width: 404, height: 440 }) // Resize to desired dimensions
                      .toFile(resizedImagePath); // Save to the resized image path
          
                  // Push the resized image filename (with 'resized-' prefix) to the images array
                  images.push(`resized-${req.files[i].filename}`);
              }
          }
          

            // Validate category
            const categoryId = await Category.findOne({ name: category });
            if(categoryId){
                const newProduct = new Product({
                    productName: productName,
                    description: description,
                    category:categoryId._id,
                    regularPrice: regularPrice,
                    color : color,
                    salePrice : salePrice,
                    createdOn: new Date(),
                    quantity: quantity,
                    productImage: images,
                    status: 'Available', // Fixed typo here
                });
                await newProduct.save();

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
                    status: 'Available', // Fixed typo here
                });
                await newProduct.save();

            return res.redirect("/addProducts");
            }
            
        } else {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
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

      // Construct the search query
      const searchQuery = {
          productName: { $regex: new RegExp(search, "i") } // Case-insensitive search
      };

      // Fetch products with pagination
      const productData = await Product.find(searchQuery)
          .limit(limit)
          .skip((page - 1) * limit)
          .populate('category') // Populate the category field
          .exec();

      // Count total matching products
      const count = await Product.countDocuments(searchQuery);

      // Fetch categories that are listed
      const category = await Category.find({ isListed: true });

      if (category) {
          res.render("admin_products", {
              data: productData,
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              cat: category,
          });
      } else {
          res.render("admin/page-error");
      }

  } catch (error) {
      console.error("Error fetching products:", error);
      res.redirect("/admin/page-error");
  }
};

const blockProduct = async(req,res) => {
  try {
      let id = req.query.id;
      
      await Product.updateOne({_id:id},{$set:{isBlocked:true}});
      res.redirect("/admin/products");
  } catch (error) {
      console.error('Error blocking product:', error); // Log the error
      res.redirect("/admin/page-error");
  }
}

const unblockProduct = async (req,res) => {
  try {
      let id = req.query.id;
      await Product.updateOne({_id:id},{$set:{isBlocked:false}});
      res.redirect("/admin/products");
  } catch (error) {
      console.error('Error unblocking product:', error); // Log the error
      res.redirect("/admin/page-error");
  }
}


const getEditProduct = async (req,res) => {
    try {
        const id= req.query.id;
        const product =await Product.findOne({_id:id});
        const existingCategory = await Category.findOne({_id:product.category,isListed:true});
        const category = await Category.find({isListed:true});
        // console.log(productCategory.name);
        res.render("edit_products",{
            product:product,
            pcat:existingCategory,
            cat:category
        })
        
    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;

        // Check if the product exists
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        const data = req.body;

        // Check if product name already exists (excluding the current product)
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product name already exists. Please try another name." });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                images.push(file.filename);
            });
        }

        // Prepare fields to update
        const updateFields = {
            productName: data.productName,  // Fixed typo here
            description: data.description,
            category: product.category,    // Using existing category if not updated
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color
        };

        // Append new images if available
        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        // Perform the update
        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        res.redirect("/admin/products");

    } catch (error) {
        console.error("Error updating product:", error.message);
        res.redirect("/admin/page-error");
    }
};



const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdServer } = req.body;

        // Update the product by removing the image from the array
        await Product.findByIdAndUpdate(productIdServer, {
            $pull: { productImage: imageNameToServer }
        });

        // Path to the image to be deleted
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
       ` 
        Check if the image exists and then delete it`
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            // console.log(`Image ${imageNameToServer} deleted successfully.`);
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
        }

        res.send({ status: true });

    } catch (error) {
        console.error("Error deleting image:", error.message);
        res.redirect("/admin/page-error");
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