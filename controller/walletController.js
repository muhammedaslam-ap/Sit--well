const Wallet = require('../models/walletSchema')
const User = require('../models/userSchema')


const getUserWallet = async (req, res) => {
    try {
        const userId = req.session.user._id;

        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            wallet = { balance: 0, transactions: [] };
        } else if (!wallet.transactions) {
            wallet.transactions = [];
        }

        console.log("Wallet data:", wallet);

        res.render('wallet', { userId, wallet });

    } catch (error) {
        console.error('Error in getUserWallet:', error);
        res.redirect('/pageNotFound');
    }
};


const processWalletPayment = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { totalAmount, selectedAddress, selectedPayment } = req.body;
        console.log("Total Amount from Client:", totalAmount); // Debugging line
        console.log("Selected Address from Client:", selectedAddress); // Debugging line
        console.log("Selected Payment Method from Client:", selectedPayment); // Debugging line
        req.session.paypalDetails  =  {totalAmount:totalAmount,selectedPayment:selectedPayment,selectedAddress:selectedAddress}

        
        const amountToDebit = parseFloat(totalAmount);

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet || wallet.balance < amountToDebit) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance in the wallet to complete this transaction.",
            });
        }

        wallet.balance -= amountToDebit;
        wallet.transactions.push({
            transaction_type: "debit",
            transaction_status: "completed",
            amount: amountToDebit,
            transaction_date: new Date(),
        });

        await wallet.save();

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



const saveWallet = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { amount } = req.body;
        console.log(amount)

        const isCredit = true; 

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            if (!isCredit) {
                return res.status(400).json({ error: 'Insufficient balance for debit transaction' });
            }

            wallet = new Wallet({
                user: userId,
                balance: parseFloat(amount),
                transactions: []
            });
        } else {
            if (isCredit) {
                wallet.balance += parseFloat(amount); 
            } else {
                if (wallet.balance < amount) {
                    return res.status(400).json({ error: 'Insufficient balance for debit transaction' });
                }
            }
        }

        const transactionType = isCredit ? "credit" : "debit";

        wallet.transactions.push({
            transaction_type: transactionType,
            transaction_status: "completed",
            amount: parseFloat(amount),
            transaction_date: new Date()
        });

        await wallet.save();
         
        req.flash('success', 'Transaction successful', { balance: wallet.balance, transactions: wallet.transactions } )
        res.redirect('/userwallet')
    } catch (error) {
        console.error("Error saving wallet transaction:", error);
        res.status(500).json({ error: 'An error occurred while processing the transaction' });
    }
};



module.exports= {
    getUserWallet,
    saveWallet,
    processWalletPayment
}