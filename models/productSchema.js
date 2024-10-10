const mongoose=require('mongoose')
const {Schema}=mongoose

const productSchema=new Schema({
     name:{
        type:String,
        required:true
     },
     decription:{
         type:String,
         required:true
     },
     category:{
        type:String,
        required:true
     },
     regularPrice:{
        type:Number,
        required:true
     },
     salePrice:{
        type:Number,
        required:true
     },
     productOffer:{
        type:Number,
        default:0
     },
     quantity:{
        type:Number,
        required:true
     },
     color:{
        type:String,
        required:true
     },
     productImage:{
        type:[String],
        required:true
     },
     is_block:{
        type:Boolean,
        default:false
     },
     status:{
        type:String,
        enum:['avilable','out Of Stock','Discontinued'],
        required:true,
        default:'avilable'
     }
},{timestamps:true})

const Product=mongoose.model('Product',productSchema)
module.exports = Product
