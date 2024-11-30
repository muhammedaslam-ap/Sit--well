const mongoose=require('mongoose')
const {Schema}=mongoose

const userSchema=new Schema({
    name:{
        type:String,
        required:true,

    },
    email:{
        type:String,
        required:true,
        unique:true,

    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId: {
        type: String,
        unique:true,
        sparse:true
       
    },
    password:{
        type:String,
        required:false,
    },
    is_blocked:{
        type:Boolean,
        default:false
    },
    is_admin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"cart",
    }],
    wallet:{
        type:Number,
        default:0
    },
    whishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Whishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:'Order'
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String,
        // required:true
    },
    redeemed:{
        type:Boolean,
        // default:false
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        // require:true
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]
})

const User=mongoose.model('User',userSchema)
module.exports =  User