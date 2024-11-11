
const mongoose=require('mongoose')
const {Schema}=mongoose

const couponSchema=new Schema({
   name:{
    type:String,
    required:true,
    unique:true
   },
   couponCode:{
    type:String,
    required:true
   },
   createdOn:{
    type:Date,
    default:Date.now,
    required:true
   },
   expireOn:{
    type:Date,
    required:true
   },
   discount:{
    type:Number,
    required:true
   },
   minimumOffer:{
    type:Number,
    required:true
   },
   limit:{
    type:Number,
    required:true
   },
   islist:{
    type:Boolean,
    default:true
   },
   user:[{
      userId: {
         type: Schema.Types.ObjectId,
         ref: 'User', 
         required: true 
     },
     couponLimit:{
      type:Number,
      default:0
     }
   }]
})
const Coupon = mongoose.model('Coupon',couponSchema)
module.exports=  Coupon
