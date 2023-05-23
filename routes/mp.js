const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const { DateTime } = require("luxon");

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
  const { monthStart, monthEnd } = req.query;

  if (!monthStart || !monthEnd) res.status(400).send({error: "monthStart or monthEnd parameter not provided"}).end();

  try {
    const data = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        $filter: `Prayer_Schedules.[Start_Date] BETWEEN '${monthStart}' AND '${monthEnd}' AND Cancelled=0`,
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

module.exports = router;