const mongoose=require('mongoose')
const {Schema}=mongoose

const productSchema=new Schema({
     name:{
        type:String,
        required:false
     },
     decription:{
         type:String,
         required:false
     },
     category:{
        type:String,
        required:true
     },
     regularPrice:{
        type:Number,
        required:false
     },
     salePrice:{
        type:Number,
        required:false
     },
     productOffer:{
        type:Number,
        default:0
     },
     quantity:{
        type:Number,
        required:false
     },
     color:{
        type:String,
        required:false
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
