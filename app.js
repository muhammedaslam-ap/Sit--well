 const express=require('express')
 const app=express()
 const path=require('path')
 const env=require('dotenv').config()
 const userRoute=require('./routes/userRoute')
 const db=require('./configaration/db')
 db()
 
 
 
 
 app.use(express.static('public'))
 app.use('/',userRoute)

app.listen(process.env.PORT,()=>{console.log(`server is running on 3000`)})

module.exports= app
