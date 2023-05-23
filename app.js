const express = require('express');
const app = express();
var session = require('express-session');

//middleware
app.use(express.json());
require('dotenv').config();

if(process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https')
        res.redirect(`https://${req.header('host')}${req.url}`)
        else
        next()
    })
}

app.use(express.json({ limit: '16MB' }));
app.use(express.urlencoded({ extended: true }));

const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use("/styles",express.static(__dirname + "/views/styles"));
app.use("/styles-widgets",express.static(__dirname + "/views/styles-widgets"));
app.use("/scripts",express.static(__dirname + "/views/scripts"));
app.use("/assets",express.static(__dirname + "/views/assets"));
// app.use("/README.md",express.static(__dirname + "/README.md"));

const port = process.env.PORT || 3000;

//imported functions
const {populate} = require('./populate');

//navigation routing
app.use('/', require('./routes/index'));
app.use('/api/v2/mp', require('./routes/mp'));

const start = async () => {
    try {
        app.listen(port, console.log(`\n server is listening on port ${port}\n http://localhost:${port}`));
    } catch (error) { console.log(error) }
}
start();