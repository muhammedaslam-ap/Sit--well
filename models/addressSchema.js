const mongoose=require('mongoose')
const {Schema}=mongoose

const addressSchema=new Schema({
       userId:{
        type:Schema.Types.ObjectId,
        ref:'USer',
        required:true
       },
       address:[{
        addressType:{
            type:String,
            require:true,
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        landMark:{
            type:String,
            requied:true
        },
        state:{
            type:String,
            required:true
        },
        pinCode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altPhone:{
            type:String,
            required:true
        }
       }]
})

const Address=mongoose.model('Address',addresSchema)
module.exports={
    Address
}