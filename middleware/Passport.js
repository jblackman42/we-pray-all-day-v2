const LocalStrategy = require('passport-local').Strategy;
const {MP} = require('../models/MP.js');

module.exports = function (passport) {
    //Serialization + deserialization for simultaneous logins
    passport.serializeUser(function (user, done) {
        // console.log("Serialize is running");
        done(null, user)
    })

    passport.deserializeUser(function (user, done) {
        // console.log("Deserialize is running");
        MP.findByGUID(user._User_GUID)
            .then((user) => {
                done(null, user)
            })
    })

    passport.use(
        new LocalStrategy({ User_Name: 'User_Name' }, (username, password, done) => {
            MP.findOne({ Email_Address: username })
                .then((user) => {
                    // console.log("User:", user);

                    if(!user){
                        return done(null,false,{message: 'User not found'});
                    }
                    //match pass
                    if (MP.compare(password,user.Password)){
                        return done(null,user);
                    }else{
                        return done(null, false, { message: 'password Incorrect'})
                    }
                })
                .catch((err) => { done(err) })
        })
    )
}