const paypal = require('paypal-rest-sdk')
const axios  = require('axios')



const convertCurrency = async (amount) => {
  
    try {
      const toCurrency = 'USD'
      const fromCurrency = 'INR'
      const apiKey = process.env.OPEN_EXCHANGE_API_KEY; 
      
      const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
      
      if (response.data && response.data.rates) {
        const usdToInrRate = response.data.rates[fromCurrency];
        const usdToUsdRate = response.data.rates[toCurrency];
        const convertedAmount = amount * (usdToUsdRate / usdToInrRate);
        
        return  convertedAmount.toFixed(2);;
      } else {
        throw new Error('Unable to retrieve exchange rates.');
      }
  
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  };  
  


paypal.configure({
    'mode':process.env.PAYPAL_MODE,
    'client_id':process.env.PAYPAL_CLIENT_ID,
    'client_secret':process.env.PAYPAL_SECRET_KEY
    
})
 


const paypalPayment = async (req, res) => {
    try {
        const {totalAmount,selectedPayment,selectedAddress,orderId} = req.body
        const USDconvertor = await convertCurrency(totalAmount)
        if(!orderId){
            req.session.paypalDetails  =  {totalAmount:totalAmount,selectedPayment:selectedPayment,selectedAddress:selectedAddress,USDconvertor:USDconvertor,paymentStatus:'failed'}
        } else {
            req.session.paypalDetails  =  {totalAmount:totalAmount,orderId:orderId,USDconvertor:USDconvertor,paymentStatus:'failed'}
        }
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": 'paypal'
            },
            "redirect_urls": {
                "return_url": "https://sitwell.aslamap.tech/paymentseccuss",
                "cancel_url": "https://sitwell.aslamap.tech/paymentfail"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Red Sox Hat",
                        "sku": "001",
                        "price": USDconvertor,
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": USDconvertor
                },
                "description": "Hat for the best team ever"
            }]
        };

        // Create PayPal payment
        paypal.payment.create(create_payment_json, (error, payment) => {
            if (error) {
                console.error("PayPal error:", error);
                res.status(500).json({ success: false, message: "PayPal payment creation failed." });
            } else {
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
                if (approvalUrl) {
                    res.json({ success: true, approval_url: approvalUrl.href });
                } else {
                    res.status(500).json({ success: false, message: "Approval URL not found." });
                }
            }
        });
    } catch (error) {
        console.error("Unexpected error during PayPal payment creation:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const success = async (req, res) => {
    try {
        const USDconvertor =    req.session.paypalDetails.USDconvertor ; 
        req.session.paypalDetails.paymentStatus = 'success'
   
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;
        
        if (!payerId || !paymentId) {
            return res.redirect('/paymentError');
        }


        
        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    "currency": "USD",
                    "total": USDconvertor 
                }
            }]
        };

        paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
            if (error) {
                console.error("Payment execution error:", error.response);
                return res.redirect('/paymentError');
            } else {
                console.log("Payment successful:", JSON.stringify(payment));
                return res.redirect('/proceedToPayment');
            }
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.redirect('/paymentError'); 
    }
};


const paymentCancel = async(req,res) => {
    try {
        req.session.paypalDetails.paymentStatus = 'failed'
        res.redirect("/proceedToPayment")
    } catch (error) {
        console.error("PayPal payment Cancelation error:", error);
        res.status(500).json({ success: false, message: "PayPal payment Cancelation failed." });
  }
}


   
     



module.exports={
    paypalPayment,
    success,
    convertCurrency,
    paymentCancel
}