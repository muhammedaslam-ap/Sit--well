const User = require("../models/userSchema");
const Wallet = require("../models/walletSchema");
const paypal = require('paypal-rest-sdk');
const axios = require("axios");



const loadWallet = async (req,res) => {
    try {

        const user = req.session.user._id;
        const existingUserWallet = await Wallet.findOne({user: user}).populate("transactions")        

        if(existingUserWallet) {
            existingUserWallet.transactions.sort((a, b) => b.transaction_date - a.transaction_date);
            res.render('wallet',{wallet:existingUserWallet})
        } else {
            res.render('wallet',{ wallet :false })
        }
    } catch (error) {
        console.log("loading the Wallet Page has some issues", error);
        res.status(500).json({success:false,message:"Server error"})
    }
}

const addMoneyToWallet = async(req,res) => {
    try {
        const addAmount = req.session.walletAmount.addAmount
        const user = req.session.user._id
        const existingUserWallet = await Wallet.findOne({user : user})

        if(user) {
            if(existingUserWallet) {
                const newBalance = Number(existingUserWallet.balance) + Number(addAmount)
                
                await Wallet.updateOne(
                    { user: user },
                    {
                        $set: { balance: newBalance },
                        $push: {
                            transactions: {
                               transaction_date: Date.now(),
                                transaction_type: "Deposit",
                                transaction_status: "Completed",
                                amount: addAmount
                            }
                        }
                    }
                );
    
                res.redirect('/userwallet')
            } else {
                const newWallet = new Wallet({
                    user:user,
                    balance:addAmount,
                    transactions:[{
                        transaction_date: Date.now(),
                        transaction_type:"Deposit",
                        transaction_status:"Completed",
                        amount:addAmount
                    }]
                })
                await newWallet.save()
                res.redirect('/userwallet')
            }
        } else {
            res.redirect('/userwallet')
        }


    } catch (error) {
        console.log("Money adding in wallet has some issues", error);
        res.status(500).json({success:false,message:"Server error"})
    }
}


//currencyConverter
const convertCurrency = async (amount) => {
    try {
      const apiKey = process.env.OPEN_EXCHANGE_API_KEY; 
      const fromCurrency = 'INR'
      const toCurrency = 'USD'
  
      const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
      
      if (response.data && response.data.rates) {
        const usdToInrRate = response.data.rates[fromCurrency];
        const usdToUsdRate = response.data.rates[toCurrency];
        const convertedAmount = amount * (usdToUsdRate / usdToInrRate);
        
        return convertedAmount.toFixed(2);
      } else {
        throw new Error('Unable to retrieve exchange rates.');
      }
  
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  };  


  const processWalletPayment = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { totalAmount, selectedAddress, selectedPayment } = req.body;
        console.log("Total Amount from Client:", totalAmount); // Debugging line
        // console.log("Selected Address from Client:", selectedAddress); // Debugging line
        // console.log("Selected Payment Method from Client:", selectedPayment); // Debugging line
        req.session.paypalDetails  =  {totalAmount:totalAmount,selectedPayment:selectedPayment,selectedAddress:selectedAddress}

        
        const amountToDebit = parseFloat(totalAmount);

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet || wallet.balance < amountToDebit) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance in the wallet to complete this transaction.",
            });
        }

        const newBalance = wallet.balance - amountToDebit
                await Wallet.updateOne(
                    {user:userId},
                    {$set:{balance:newBalance},
                    $push: {
                        transactions: {
                            transaction_date: Date.now(),
                            transaction_type: "Debit",
                            transaction_status: "Completed",
                            amount: totalAmount
                        }
                    }}
                )

// console.log('newBalance:',newBalance);

        res.status(200).json({
            success: true,
            message: "Payment completed successfully from wallet.",
            redirect_url: '/proceedToPayment', 
        });

    } catch (error) {
        console.error("Error processing wallet payment:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing the payment.",
        });
    }
};

//payment integration
paypal.configure({
    'mode':process.env.PAYPAL_MODE,
    'client_id':process.env.PAYPAL_CLIENT_ID,
    'client_secret':process.env.PAYPAL_SECRET_KEY
    
})

const getPayPal = async(req,res) => {
    try {
        const addAmount = req.body.addAmount
        const USDCurrency = await convertCurrency(addAmount);
        console.log(addAmount)
        
        req.session.walletAmount = {
            USDCurrency: USDCurrency,
            addAmount:addAmount
        }
        
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "Paypal"
            },
            "redirect_urls": {
                "return_url": "http://localhost:3000/walletSuccessPayPal",
                "cancel_url": "http://localhost:3000/walletCancelPayPal"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Red Sox Hat",
                        "sku": "001",
                        "price": USDCurrency,
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": USDCurrency
                },
                "description": "Hat for the best team ever"
            }]
        };

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
        console.error("PayPal payment creation error:", error);
        res.status(500).json({ success: false, message: "PayPal payment creation failed." });
    }
}


const successPayPal = async (req,res) => {
    try {
            const payerId = req.query.PayerID;
            const paymentId = req.query.paymentId;
            const walletData = req.session.walletAmount;
          
            const execute_payment_json = {
              "payer_id": payerId,
              "transactions": [{
                  "amount": {
                      "currency": "USD",
                      "total": walletData.USDCurrency
                  }
              }]
            };
          
            paypal.payment.execute(paymentId, execute_payment_json, function (error) {
              if (error) {   
                  console.log(error.response);
                  throw error;
              } else {
                  res.redirect("/addMoneyToWallet")
              }
          });
    } catch (error) {
        console.error("PayPal payment Success error:", error);
        res.status(500).json({ success: false, message: "PayPal payment Doesn't Success." });
    }
}

const cancelPayPal = async(req,res) => {
    try {
            res.redirect("/wallet")
    } catch (error) {
        console.error("PayPal payment Cancelation error:", error);
        res.status(500).json({ success: false, message: "PayPal payment Cancelation failed." });
    }
}


module.exports = {
    loadWallet,
    addMoneyToWallet,
    getPayPal,
    successPayPal,
    cancelPayPal,
    processWalletPayment
}