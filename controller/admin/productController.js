const Product = require('../../models/productSchema')
const category = require('../../models/categorySchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const getProductAddPage = async (req,res)=>{
    try {
        const category = await Category.find({islisted:true})
        res.render('product_add',{cat:category})
    } catch (error) {
        res.redirect('/pageerror')
    }
}




module.exports={
    getProductAddPage
}