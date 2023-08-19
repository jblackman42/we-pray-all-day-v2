// Importing required modules
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
require('dotenv').config();
require('./middleware/Passport.js')(passport);

const app = express();
// var livereload = require("livereload");
// var connectLiveReload = require("connect-livereload");
// const cors = require('cors');


// if (process.env.ENVIRONMENT = 'dev') {
//   const liveReloadServer = livereload.createServer();
//   liveReloadServer.server.once("connection", () => {
//     setTimeout(() => {
//       liveReloadServer.refresh("/");
//     }, 100);
  
//   });
  
//   app.use(connectLiveReload());
// }

// app.use(cors({
//   origin: '*'
// }));

// Express settings
app.set('trust proxy', 1); // Trust first proxy
app.set('view engine', 'ejs'); // Set the view engine to ejs

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.SESSION_SECRET === 'production', maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Package size middleware
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Static file middleware for serving styles, scripts and assets
app.use("/styles",express.static(__dirname + "/views/styles"));
app.use("/styles-widgets",express.static(__dirname + "/views/styles-widgets"));
app.use("/scripts",express.static(__dirname + "/views/scripts"));
app.use("/assets",express.static(__dirname + "/views/assets"));
// app.use("/README.md",express.static(__dirname + "/README.md"));

const port = process.env.PORT || 3000;

//navigation routing
app.use('/', require('./routes/index'));
// API Routing
app.use('/api/v2/mp', require('./routes/mp'));
app.use('/api/auth', require('./routes/oauth'));
app.use('/api/v1/authenticate', require('./routes/authenticate.js'));
app.use('/api/v1/MinistryPlatformAPI', require('./routes/ministryPlatformAPI.js'));
app.use('/api/twilio', require('./routes/twilio.js'));

app.use('/api/sms', require('./routes/sms.js'));

const start = async () => {
    try {
        app.listen(port, console.log(`\n server is listening on port ${port}\n http://localhost:${port}`));
    } catch (error) { console.log(error) }
}
start();