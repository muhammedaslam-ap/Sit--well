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

        // Initialize address and edit mode
        let address = {};
        let isEditing = false;

        // If editing, fetch the specific address
        if (addressId) {
            address = await Address.findOne({ _id: addressId, userId: user._id });

            // If address not found, handle the error
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
    console.log("postAddAddress function called");
    console.log('session.data:', req.session);
    
    try {
        const { addressType, name, city, district, addressLine1, landMark, state, pinCode, phone, altPhone } = req.body;
        console.log("Request body:", req.body);

        const user = req.session.user;

        // Check for user session
        if (!user || !user._id) {
            req.flash('error', 'User session not found!');
            return res.redirect('/addAddress');
        }
        console.log("User session found:", user._id);

        // Input validation
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

        // If there are validation errors, redirect with errors
        if (validationErrors.length > 0) {
            req.flash('error', validationErrors);
            return res.redirect('/addAddress');
        }

        // User existence check
        const existingUser = await User.findById(user._id);
        if (!existingUser) {
            console.log("User not found in database");
            req.flash('error', 'User not found!');
            return res.redirect('/addAddress');
        }

        const existingAddress = await Address.findOne({ userId: existingUser._id });
        console.log("Existing address:", existingAddress);

        if (!existingAddress) {
            // Save a new address document for the user
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
            console.log("New address saved");
            req.flash('success', 'Address added successfully!');
        } else {
            // Update existing address array
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
            req.flash('success', 'Address added to your existing addresses.');
        }

        return res.redirect('/addAddress'); // Stay on add address page

    } catch (error) {
        console.error("Error in postAddAddress:", error);
        req.flash('error', 'An error occurred while adding the address.');
        return res.redirect('/addAddress'); // Stay on add address page in case of error
    }
};


const getEditAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const user = req.session.user;

        console.log('Address ID:', addressId);
        console.log('User ID:', user ? user._id : 'User not found in session');

        if (!user || !user._id) {
            req.flash('error', 'User session not found.');
            return res.redirect('/login');
        }

        const userAddresses = await Address.findOne({ userId: user._id }).sort({ createdOn : -1 });

        const addressDocument = await Address.findOne({ userId: user._id, 'address._id': addressId });
        const address = addressDocument ? addressDocument.address.id(addressId) : null;

        if (!address) {
            console.log('Address not found');
            req.flash('error', 'Address not found.');
            return res.redirect('/addAddress');
        }

        console.log('Address found:', address);
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
        console.log("Request body:", req.body);

        // Check if the user is in session
        const user = req.session.user;
        if (!user || !user._id) {
            console.log("User session not found.");
            req.flash('error', 'User session not found.');
            return res.redirect('/checkout');
        }
        console.log("User session found:", user._id);

        // Find the user in the database
        const existingUser = await User.findById(user._id);
        if (!existingUser) {
            console.log("User not found in database");
            req.flash('error', 'User not found in the database.');
            return res.redirect('/checkout');
        }

        // Check if an address already exists for this user
        const existingAddress = await Address.findOne({ userId: existingUser._id });
        console.log("Existing address found:", existingAddress);

        if (!existingAddress) {
            // Create a new address if none exists
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
            console.log("New address saved for user ID:", existingUser._id);
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

            console.log("New address added to existing addresses for user ID:", existingUser._id);
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