const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const { MP } = require('../models/MP');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { ensureAuthenticated, ensurePrayerLeader, ensurePrayerLeaderByID } = require('../middleware/authorize.js')

const getAccessToken = async () => {
  const data = await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
      data: qs.stringify({
          grant_type: 'client_credentials',
          scope: 'http://www.thinkministry.com/dataplatform/scopes/all',
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
      })
  })
      .then(response => response.data)
      .catch(err => console.log(err))
      
  return data.access_token;
}

router.get('/getCommunities', async (req, res) => {
  try {
    const data = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Communities',
      params: {
        '$filter': `ISNULL(End_Date, GETDATE()) >= GETDATE()`
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'Application/Json'
      }
    })
      .then(response => response.data)

    res.status(200).send(data).end();
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.get('/getSchedules', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) res.status(400).send({error: "monthStart or monthEnd parameter not provided"}).end();

  try {
    const data = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        $filter: `Prayer_Schedules.[Start_Date] BETWEEN '${startDate}' AND '${endDate}' AND Cancelled=0`,
        $orderby: `Start_Date`,
        $select: `Prayer_Schedule_ID, Prayer_Schedules.[Start_Date], Prayer_Schedules.[End_Date], Prayer_Schedules.[WPAD_Community_ID], WPAD_Community_ID_Table.[Community_Name]`
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'Application/Json'
      }
    })
      .then(response => response.data)

    res.status(200).send(data).end();
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.get('/getReservations', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) res.status(400).send({error: "startDate or endDate parameter not provided"}).end();

  try {
    const data = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Community_Reservations',
      params: {
        $filter: `Reservation_Date BETWEEN '${startDate}' AND '${endDate}' AND (WPAD_Community_ID_Table.[End_Date] IS NULL OR WPAD_Community_ID_Table.[End_Date] > GETDATE())`,
        $orderby: `Reservation_Date`,
        $select: `Reservation_Date, WPAD_Community_Reservations.WPAD_Community_ID, Community_Name`,
        $distinct: 'true'
      },
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'Application/Json'
      }
    })
      .then(response => response.data)

    res.status(200).send(data).end();
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.get('/PrayerCommunities', async (req, res) => {
    try {
        const data = await axios({
            method: 'get',
            url: `${process.env.BASE_URL}/tables/WPAD_Communities`,
            params: {
              $select: 'WPAD_Community_ID, Community_Name, Reminder_Text',
              $filter: 'End_Date > GETDATE() OR End_Date IS NULL',
              $orderby: 'Community_Name'
            },
            headers: {
                'Authorization': `Bearer ${await getAccessToken()}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.data);
        
        res.status(200).send(data).end();
    } catch (error) {
        res.status(500).send(error).end();
    }
})

router.get('/PrayerSchedules', async (req, res) => {

    const {$filter} = req.query;

    try {
        const data = await axios({
            method: 'get',
            url: `https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules${$filter ? `?$filter=${$filter}` : ''}`,
            headers: {
                'Authorization': `Bearer ${await getAccessToken()}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.data);
        
        res.status(200).send(data).end();
    } catch (err) {
      console.error(err);
      res.status(500).send({error: err}).end();
    }
})

router.post('/PrayerSchedules', async (req, res) => {
  try {
      const data = await axios({
          method: 'post',
          url: `https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules`,
          data: req.body,
          headers: {
              'Authorization': `Bearer ${await getAccessToken()}`,
              'Content-Type': 'application/json'
          }
      })
          .then(response => response.data);
      
      res.status(200).send(data).end();
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.post('/ConfirmationEmail', async (req, res) => {
  const { Email, First_Name, DateString, TimeString, Dates } = req.body;
  console.log(Dates)
  try {
    // Define the email data
    const msg = {
      to: Email, // Change to your recipient
      from: 'noreply@pureheart.org', // Change to your verified sender
      subject: 'We Pray All Day',
      html: MP.getWPADEmailTemplate(First_Name, DateString, TimeString, Dates),
    };

    const email = await sgMail
      .send(msg)
      .then(emailData => emailData)
    
    res.status(200).send(email).end();
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.get('/GenerateSequence', async (req, res) => {
  const { Interval, StartDate, DayPosition, TotalOccurrences, Weekdays } = req.query;

  try {
    const data = await axios({
        method: 'get',
        url: `https://my.pureheart.org/ministryplatformapi/tasks/generate-sequence`,
        params: {
          $type: 'Monthly',
          $interval: Interval,
          $startDate: StartDate,
          $totalOccurrences: TotalOccurrences,
          $dayPosition: DayPosition,
          $weekdays: Weekdays
        },
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.data);
    
    res.status(200).send(data).end();
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.post('/sequence', async (req, res) => {
  const {totalOccurences, dayPosition, weekdays} = req.body;

  try {
      const sequence = await axios({
          method: 'get',
          url: `https://my.pureheart.org/ministryplatformapi/tasks/generate-sequence?$type=Monthly&$totalOccurrences=${totalOccurences}&$dayPosition=${dayPosition}&$weekdays=${weekdays}`,
          headers: {
              'Content-Type': 'Application/Json',
              'Authorization': `Bearer ${await getAccessToken()}`
          }
      })
          .then(response => response.data)
  
      res.send(sequence);
  } catch (err) {
    console.error(err);
    res.status(500).send({error: err}).end();
  }
})

router.post('/register', async (req, res) => {
  try {
    const { Address_Line, City, Church_Name, State, Postal_Code, Phone, Email, Pattern, Prayer_Requests, First_Name, Last_Name, Username, Password } = req.body;
    
    if (!Address_Line || !City || !Church_Name || !State || !Postal_Code || !Phone || !Email || !Pattern || !Prayer_Requests || !First_Name || !Last_Name || !Username || !Password) return res.status(400).send({error: 'Missing Parameters'}).end();
  
    const user = {
      "@FirstName": First_Name,
      "@LastName": Last_Name,
      "@EmailAddress": Email,
      "@PhoneNumber": Phone,
      "@Username": Username,
      "@Password": MP.hashPassword(Password),
      "@AddressLine1": Address_Line,
      "@City": City,
      "@State": State,
      "@PostalCode": Postal_Code
    }
  
    const communityData = {
      Community_Name: Church_Name,
      Address: Address_Line,
      City: City,
      State: State,
      Zip: Postal_Code,
      Start_Date: MP.formatDate(new Date()),
      Reminder_Text: Prayer_Requests
    }
  
    // create contact/user/participant/household
    const contact = await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/procs/api_WPAD_Force_New_Contact',
      data: user,
      headers: {
        'Content-Type': 'Application/Json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data[0][0])
  
    // create wpad community
    const community = await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Communities',
      data: [communityData],
      headers: {
        'Content-Type': 'Application/Json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data[0])
  
    const { User_Account } = contact;
    const { WPAD_Community_ID } = community;
  
    // create authorized user
  
    await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Authorized_Users',
      data: [{
        WPAD_Community_ID: WPAD_Community_ID,
        user_ID: User_Account
      }],
      headers: {
        'Content-Type': 'Application/Json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    })

    // create reservations
    const reservationData = Pattern.map(date => {
      return {
        Reservation_Date: MP.formatDate(date),
        WPAD_Community_ID: WPAD_Community_ID
      }
    })
    
    await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Community_Reservations',
      data: reservationData,
      headers: {
        'Content-Type': 'Application/Json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    })

    res.send({
      contact: contact,
      community: community
    });
  } catch (error) {
    // console.log(error)
    res.status(500).send(error).end();
  }
})

// routes for dashboard
router.get('/myCommunity', ensurePrayerLeader, async (req, res) => {
  try {
    const { user } = req.session;
    res.send(await axios({
      method: 'get',
      url: `https://my.pureheart.org/ministryplatformapi/tables/WPAD_Authorized_Users`,
      params: {
          $select: 'WPAD_Authorized_Users.[user_ID], WPAD_Community_ID_Table.[WPAD_Community_ID],WPAD_Community_ID_Table.[Community_Name], WPAD_Community_ID_Table.[Address], WPAD_Community_ID_Table.[City], WPAD_Community_ID_Table.[State], WPAD_Community_ID_Table.[Zip], WPAD_Community_ID_Table.[Start_Date], WPAD_Community_ID_Table.[End_Date], WPAD_Community_ID_Table.[Reminder_Text]',
          $filter: `user_ID=${user.userid} AND (End_Date IS NULL OR End_Date > GETDATE())`
      },
      headers: {
          "Content-Type": "Application/JSON",
          "Authorization": `Bearer ${await getAccessToken()}`
      }
    }).then(response => response.data[0] || null))
  } catch (err) {
    res.status(500).send({error: err}).end();
  }
})

router.get('/CommunityPrayerSchedules/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    res.send(await axios({
        method: 'get',
        url: `https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules`,
        params: {
          $filter: `WPAD_Community_ID = ${id}`
        },
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})
router.get('/CommunityReservations/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    res.send(await axios({
        method: 'get',
        url: `https://my.pureheart.org/ministryplatformapi/tables/WPAD_Community_Reservations`,
        params: {
          $filter: `WPAD_Community_ID = ${id} AND Reservation_Date >= GETDATE()`,
          $orderby: 'Reservation_Date'
        },
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})

router.post('/CommunityReservations/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    const { Reservation_Date } = req.body;
    res.send(await axios({
        method: 'post',
        url: `https://my.pureheart.org/ministryplatformapi/tables/WPAD_Community_Reservations`,
        data: [{
          WPAD_Community_ID: id,
          Reservation_Date: Reservation_Date
        }],
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})
router.put('/CommunityReservations/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    const { Reservation_Date, WPAD_Community_Reservation_ID } = req.body;
    res.send(await axios({
        method: 'put',
        url: `https://my.pureheart.org/ministryplatformapi/tables/WPAD_Community_Reservations`,
        data: [{
          WPAD_Community_ID: id,
          WPAD_Community_Reservation_ID: WPAD_Community_Reservation_ID,
          Reservation_Date: Reservation_Date
        }],
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})
router.delete('/CommunityReservations/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    const { WPAD_Community_Reservation_ID } = req.body;
    res.send(await axios({
        method: 'delete',
        url: `https://my.pureheart.org/ministryplatformapi/tables/WPAD_Community_Reservations/${WPAD_Community_Reservation_ID}`,
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})

router.get('/Top10Users/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    res.send(await axios({
        method: 'get',
        url: `https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules`,
        params: {
          $select: 'WPAD_User_ID_Table.[WPAD_User_ID], WPAD_User_ID_Table.[Display_Name], Count(*) AS Count',
          $filter: `Prayer_Schedules.[WPAD_Community_ID] = ${id} AND Prayer_Schedules.[Start_Date] <= GETDATE() AND YEAR(Prayer_Schedules.[Start_Date]) = YEAR(GETDATE())`,
          $orderby: 'Count Desc',
          $groupby: 'WPAD_User_ID_Table.[WPAD_User_ID], WPAD_User_ID_Table.[Display_Name]',
          $top: '10'
        },
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})

router.put('/PrayerPoints/:id', ensurePrayerLeaderByID, async (req, res) => {
  try {
    const { id } = req.params;
    const { Reminder_Text } = req.body;
    res.send(await axios({
        method: 'put',
        url: `https://my.pureheart.org/ministryplatformapi/tables/WPAD_Communities`,
        data: [{
          WPAD_Community_ID: id,
          Reminder_Text: Reminder_Text
        }],
        headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    }).then(response => response.data[0]));
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err}).end();
  }
})

module.exports = router;