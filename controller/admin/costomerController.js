const User = require('../../models/userSchema');

const costomerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        let limit = 3;

      
        const userData = await User.find({
            is_admin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } }, 
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ],
        })
        .limit(limit) 
        .skip((page - 1) * limit)
        .exec();

     
        const count = await User.countDocuments({
            is_admin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ],
        });

      
        const totalPages = Math.ceil(count / limit);

 
        res.render("admin_costomers", {
            data: userData,      
            currentPage: page,  
            totalPages: totalPages,
            search: search        
        });
    } catch (error) {
        console.error("Error fetching customer data:", error);
        res.status(500).send("Internal Server Error");
    }
};


const  costomerBlocked = async (req,res)=>{
    try {
        id = req.query.id
        await User.updateOne({_id:id},{$set:{is_blocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}


const costomerUnblocked = async (req,res)=>{
    try {
        id = req.query.id
        await User.updateOne({_id:id},{$set:{is_blocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}


module.exports = {
    costomerInfo,
    costomerUnblocked,
    costomerBlocked
};
