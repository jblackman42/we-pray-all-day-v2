// const passport = require("passport")
// const express = require("express")
// const Router = express.Router()
const express = require('express');
const app = express.Router();
const passport = require('passport');

app.post('/login', async (req, res, next) => { //login
    passport.authenticate('local', {
        failureFlash: true,
        successRedirect: '/',
        failureRedirect: '/login'
    })(req, res, next)
})

// app.get('/current', async(req, res) => {
//     if (req.user === undefined) {
//         // The user is not logged in
//         res.json({});
//     } else {
//         res.json({
//             user: req.user
//         });
//     }
// })


// app.get('/', async (req, res) => {
//   try {
//       const allUsers = await UserSchema.find({});
//       res.status(201).json({ allUsers });
//   } catch (error) { res.status(500).json({ msg: error }) }
// })
// app.delete('/', async (req, res) => {
//   try {
//       await UserSchema.deleteMany({});
//       res.status(201).json({ success: true, msg: "all users deleted" });
//   } catch (error) { res.status(500).json({ msg: error }) }
// })

module.exports = app;