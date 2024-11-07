const paypal = require('paypal-rest-sdk')
const convertCurrency = require('../services/currencyConverter')

paypal.configure({
    'mode':process.env.PAYPAL_MODE,
    'client_id':process.env.PAYPAL_CLIENT_ID,
    'client_secret':process.env.PAYPAL_SECRET_KEY
    
})
 
const payProduct=async(req,res)=>{
    try {
        const orderDetails=req.session.placeOrder
        console.log(orderDetails);
        
        let total=await convertCurrency(orderDetails.orderTotal, 'INR', 'USD');
    
      
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "http://localhost:3000/paymentsuccess",
                "cancel_url": "http://localhost:3000/paymentcancel"
            },
            "transactions": [{
                "item_list": {
                    // "items": [{
                    //     "name": "Red Sox Hat",
                    //     "sku": "001",
                    //     "price": "25.00",
                    //     "currency": "USD",
                    //     "quantity": 1
                    // }]
                },
                "amount": {
                    "currency": "USD",
                    "total":total
                },
                // "description": "Hat for the best team ever"
            }]
        };
    
        paypal.payment.create(
            create_payment_json,
            function (error, payment) {
                if (error) {
                    throw error;
                } else {
                    for (let i = 0; i < payment.links.length; i++) {
                        if (payment.links[i].rel === 'approval_url') {
                            res.redirect(payment.links[i].href);
                        }
                    }
                }
            });
  

    
    } catch (error) {
        console.log(error);
        
    }
}

const success =async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const orderDetails=req.session.placeOrder
    const paymentMethod='PAYPAL'
    req.session.placeOrder=null


    
    let total=await convertCurrency(orderDetails.orderTotal, 'INR', 'USD');

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": { 
                "currency": "USD",
                "total": total
            }
        }]
    };

    paypal.payment.execute(paymentId,
        execute_payment_json,
        function (error, payment) {
            if (error) {
                console.log(error.response);
                throw error;
            } else {
             
                
               res.redirect(`/placeOrder/${orderDetails.addressId}/${orderDetails.couponCode}/${paymentMethod}?paymentId=${paymentId} `)
            }
        });
};  
 
const cancel = async(req,res)=>{
    try {
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;
        const orderDetails=req.session.placeOrder
        const paymentMethod='PAYPALFAILED'
        req.session.placeOrder=null


               res.redirect(`/placeOrder/${orderDetails.addressId}/${orderDetails.couponCode}/${paymentMethod}?paymentId=${paymentId} `)
    } catch (error) {
        console.log(error);
        
    }
}


module.exports = {
    payProduct,
    success,
    cancel
}