const express = require('express');
const navigation = express.Router();
const ical = require('ical-generator').default;
const fs = require('fs')
const path = require('path')

//authentication middleware
const { ensureAuthenticated, ensurePrayerLeader } = require('../middleware/authorize.js')

//home page
navigation.get('/', (req, res) => {
  res.render('pages/home')
})

navigation.get('/signup', (req, res) => {
  res.render('pages/sign-up')
})
navigation.get('/leaders', (req, res) => {
  res.render('pages/leaders')
})
navigation.get('/notaboutus', (req, res) => {
  res.render('pages/not-about-us')
})
navigation.get('/login', (req, res) => {
  res.render('pages/login', {error: null})
})
navigation.get('/register', (req, res) => {
  res.render('pages/register')
})
navigation.get('/dashboard', ensureAuthenticated, ensurePrayerLeader, (req, res) => {
  res.render('pages/dashboard')
})

navigation.get('/logout', (req, res) => {
  try {
      req.session.user = null;
      req.session.access_token = null;
      res.redirect('/')
  } catch(err) {
      res.status(500).send({error: 'internal server error'})
  }
})

navigation.get('/guide', (req, res) => {
  const filename = 'Sept-Oct 2023.pdf'
  try {
    fs.readFile(path.join(__dirname, '..', 'views', 'assets', 'guides', filename), function (err,data){
        res.contentType("application/pdf").send(data);
    });
    
  } catch (err) {
    res.status(500).send("Error reading the file.");
    console.error(err);
  }

})

navigation.get('/calendar-invite', (req, res) => {
  const {dates} = req.query;

  try {
    const pattern = dates.split(',')
  
    const cal = ical({name: "We Pray All Day Calendar"});
  
    pattern.forEach(date => {
      const startDate = new Date(date);
      const endDate = new Date(startDate.getTime() + 3600000);
  
      cal.createEvent({
        start: startDate,
        end: endDate,
        summary: "Hour of Prayer",
        description: "It's your time to pray! Here are some things to pray about:\nOur Hearts & Homes\nThe Church\nSalvations\nOurState\nOurNation\nAll the Earth\nYour Church\n\nAccess the full prayer guide here:\nhttps://weprayallday.com/guide",
        organizer: {
          name: "We Pray All Day",
          email: "info@weprayallday.com"
        }
      });
    });
    
    res.setHeader('Content-Disposition', 'attachment; filename="HourOfPrayer.ics"');
    res.setHeader('Content-Type', 'text/calendar');
    res.send(cal.toString());
  } catch (error) {
    console.log(error);
    res.status(500).send({error: 'Something went wrong. Please try again later.'})
  }
})


// navigation.get('/test', (req, res) => {
//   res.render('pages/test')
// })


module.exports = navigation;