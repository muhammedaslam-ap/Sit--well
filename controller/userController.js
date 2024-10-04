const home=async(req,res)=>{
    try {
        res.render('home')
    } catch (error) {
        console.log(error)
    }
}

const landing=async(req,res)=>{
    try {
        res.render('landing')
    } catch (error) {
        console.log(error)
    }
}

const login=async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log(error)
    }
}
const register=(req,res)=>{
    try {
        res.render('registration')
    } catch (error) {
        
    }
}

module.exports={
    home,
    landing,
    login,
    register
}