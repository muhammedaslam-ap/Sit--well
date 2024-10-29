const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Look for the user in the database
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Check if the user already has a Google ID
            if (user.googleId) {
                return done(null, user);  // User is already registered with Google
            } else {
                // User exists but hasn't linked Google, let's update their record
                user.googleId = profile.id;
                await user.save();
                return done(null, user);  // Return the updated user
            }
        } else {
            // New user registration
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
            });
            await user.save();
            return done(null, user);  // Return the newly registered user
        }
    } catch (error) {
        return done(error);  // Handle error
    }
}));

// Serialize the user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize the user from the session
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(error => {
            done(error, null);
        });
});

module.exports = passport;
