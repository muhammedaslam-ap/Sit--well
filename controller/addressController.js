const Address = require('../models/addressSchema')
const User = require('../models/userSchema')


const getaddAddress = async (req, res) => {
    try {
        const user = req.session.user;
        const addressId = req.params.id; // Check if this is undefined or has a value

        // Check user session
        if (!user || !user._id) {
            req.flash('error', 'User session not found.');
            return res.redirect('/login');
        }

        // Fetch user's addresses
        const userAddresses = await Address.findOne({ userId: user._id }).sort({ createdOn: -1 });

        let address = {};
        let isEditing = false;

        if (addressId) {
            address = await Address.findOne({ _id: addressId, userId: user._id });

            if (!address) {
                req.flash('error', 'Address not found.');
                return res.redirect('/addAddress');
            }
            isEditing = true; // Set the flag for edit mode
        }

        // Render the form with addresses and edit information
        res.render('addAddress', {
            addresses: userAddresses ? userAddresses.address : [], // Return all addresses if available
            address, // Pass the specific address if in edit mode, or an empty object for add mode
            isEditing // Flag to indicate edit mode
        });
       
    } catch (error) {
        console.log("Error at get address form", error);
        req.flash('error', 'An error occurred. Please try again!');
        return res.redirect('/pageNotFound');
    }
};




const postAddAddress = async (req, res) => {
    try {
        const { addressType, name, city, district, addressLine1, landMark, state, pinCode, phone, altPhone } = req.body;

        const user = req.session.user;

        if (!user || !user._id) {
            req.flash('error', 'User session not found!');
            return res.redirect('/addAddress');
        }

        const validationErrors = [];

        if (!name || name.trim().length < 3) {
            validationErrors.push('Name must be at least 3 characters long.');
        }
        if (!landMark || landMark.trim().length === 0) {
            validationErrors.push('Landmark is required.');
        }
        if (!phone || !/^\d{10}$/.test(phone)) {
            validationErrors.push('Phone number must be 10 digits.');
        }
        if (altPhone && !/^\d{10}$/.test(altPhone)) {
            validationErrors.push('Alternate phone number must be 10 digits.');
        }
        if (!addressLine1 || addressLine1.trim().length === 0) {
            validationErrors.push('Street address is required.');
        }
        if (!city || city.trim().length === 0) {
            validationErrors.push('City is required.');
        }
        if (!district || district.trim().length === 0) {
            validationErrors.push('District is required.');
        }
        if (!state || state.trim().length === 0) {
            validationErrors.push('State is required.');
        }
        if (!pinCode || !/^\d{6}$/.test(pinCode)) {
            validationErrors.push('Pin code must be 6 digits.');
        }
        if (!addressType || !['Home', 'Work', 'Other'].includes(addressType)) {
            validationErrors.push('Address type must be Home, Work, or Other.');
        }

        if (validationErrors.length > 0) {
            req.flash('error', validationErrors);
            return res.redirect('/addAddress');
        }

        const existingUser = await User.findById(user._id);
        if (!existingUser) {
            req.flash('error', 'User not found!');
            return res.redirect('/addAddress');
        }

        const addAddress = new Address({
            userId: existingUser._id,
            address: [{
                addressType,
                name,
                city,
                district,
                landMark,
                addressLine1,
                state,
                pinCode,
                phone,
                altPhone
            }]
        });

        await addAddress.save();
        req.flash('success', 'Address added successfully!');

        return res.redirect('/addAddress');

    } catch (error) {
        console.error("Error in postAddAddress:", error);
        req.flash('error', 'An error occurred while adding the address.');
        return res.redirect('/addAddress');
    }
};



const getEditAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const user = req.session.user;


        if (!user || !user._id) {
            req.flash('error', 'User session not found.');
            return res.redirect('/login');
        }

        const userAddresses = await Address.findOne({ userId: user._id }).sort({ createdOn : -1 });

        const addressDocument = await Address.findOne({ userId: user._id, 'address._id': addressId });
        const address = addressDocument ? addressDocument.address.id(addressId) : null;

        if (!address) {
            req.flash('error', 'Address not found.');
            return res.redirect('/addAddress');
        }

        return res.render('addAddress', {
            addresses: userAddresses ? userAddresses.address : [0], 
             address, 
             isEditing: true,

             });

    } catch (error) {
        console.log('Error in get edit address:', error);
        req.flash('error', 'An error occurred. Please try again!');
        return res.redirect('/addAddress');
    }
};


const updateAddress = async (req, res) => {
    try {
        const { addressType, name, city, district, addressLine1, landMark, state, pinCode, phone, altPhone } = req.body;
        const user = req.session.user;
        const addressId = req.params.id; 

        if (!user || !user._id) {
            req.flash('error', 'User session not found.');
            return res.redirect('/login');
        }

        const addressDocument = await Address.findOneAndUpdate(
            { userId: user._id, 'address._id': addressId },
            {
                $set: {
                    'address.$.addressType': addressType,
                    'address.$.name': name,
                    'address.$.city': city,
                    'address.$.district': district,
                    'address.$.addressLine1': addressLine1,
                    'address.$.landMark': landMark,
                    'address.$.state': state,
                    'address.$.pinCode': pinCode,
                    'address.$.phone': phone,
                    'address.$.altPhone': altPhone
                }
            },
            { new: true } 
        );

        if (!addressDocument) {
            req.flash('error', 'Address not found.');
            return res.redirect('/addAddress');
        }

        req.flash('success', 'Address updated successfully!');
        return res.redirect('/addAddress'); 

    } catch (error) {
        console.error("Error updating address:", error);
        req.flash('error', 'An error occurred. Please try again!');
        return res.redirect('/addAddress');
    }
};

const deleteAddress = async (req,res)=>{

    try {
        const addressId = req.params.id;
        const user = req.session.user;

        if (!user || !user._id) {
            req.flash('error', 'User session not found.');
            return res.redirect('/login');
        }

        const result = await Address.findOneAndUpdate(
            { userId: user._id },
            { $pull: { address: { _id: addressId } } }
        );

        if (!result) {
            req.flash('error', 'Address not found or not authorized to delete.');
            return res.redirect('/addAddress');
        }

        req.flash('success', 'Address deleted successfully.');
        res.redirect('/addAddress');
    } catch (error) {
        console.error('Error in deleteAddress:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/addAddress');
    }
};



const addAddressFromCheckout = async (req, res) => {
    try {
        const { addressType, name, city, district, addressLine1, landMark, state, pinCode, phone, altPhone } = req.body;

        const user = req.session.user;
        if (!user || !user._id) {
            req.flash('error', 'User session not found.');
            return res.redirect('/checkout');
        }

        const existingUser = await User.findById(user._id);
        if (!existingUser) {
            req.flash('error', 'User not found in the database.');
            return res.redirect('/checkout');
        }

        const existingAddress = await Address.findOne({ userId: existingUser._id });

        if (!existingAddress) {
            const newAddress = new Address({
                userId: existingUser._id,
                address: [{
                    addressType,
                    name,
                    city,
                    district,
                    landMark,
                    addressLine1,
                    state,
                    pinCode,
                    phone,
                    altPhone
                }]
            });

            await newAddress.save();
            req.flash('success', 'Address added successfully!');
            return res.redirect('/checkout');  // Redirect back to checkout

        } else {
            // Add to existing address array
            await Address.updateOne(
                { userId: existingUser._id },
                {
                    $push: {
                        address: {
                            addressType,
                            name,
                            city,
                            district,
                            landMark,
                            addressLine1,
                            state,
                            pinCode,
                            phone,
                            altPhone
                        }
                    }
                }
            );

            req.flash('success', 'New address added to your account.');
            return res.redirect('/checkout');  // Redirect back to checkout
        }

    } catch (error) {
        console.error("Error in addAddressFromCheckout:", error);
        req.flash('error', 'An error occurred while adding the address. Please try again.');
        return res.redirect('/checkout');
    }
};





module.exports = {
    getaddAddress,
    postAddAddress,
    getEditAddress,
    updateAddress,
    deleteAddress,
    addAddressFromCheckout
}