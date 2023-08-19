const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);

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
  
  // //automatically gets a new access token when the current one expires
  // setTimeout(async () => await authorize(), data.expires_in * 1000)
  return data.access_token;
}

router.get('/send-texts', async (req, res) => {
  const {ids} = req.query;
  
  if (!ids) return res.status(400).send({err: 'no prayer schedule ids provided'}).end();

  const updatedPrayers = [];
  const currPrayers = await axios({
    method: 'get',
    url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
    params: {
      '$filter': `Prayer_Schedule_ID IN ${ids} AND Message_SID IS NULL`,
      '$select': `Prayer_Schedule_ID, Prayer_Schedules.[First_Name], Prayer_Schedules.[Last_Name], Prayer_Schedules.[Start_Date], Phone, WPAD_Community_ID_Table.[Reminder_Text], Message_Status, Message_SID`,
    },
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.data)
  
    
  for (const prayer of currPrayers) {
    const { First_Name, Last_Name, Start_Date, Message_SID, Phone, Prayer_Community_ID, Company_Name, Reminder_Text } = prayer;

    const defaultPrayerPoints = 'Our Hearts & Homes\nThe Church\nSalvations\nOur State\nOur Nation\nAll the Earth\nYour Church'

    const textBody = `Hi ${First_Name}! It's your time to pray!\nHere are some things to pray about:\n\n${Reminder_Text || defaultPrayerPoints}\n\nAccess the prayer guide here:\nhttps://weprayallday.com/guide\n\nThis text reminder is brought to you by We Pray All Day.\nReply 'STOP' to unsubscribe.`;

    await telnyx.messages
      .create({
        'from': process.env.TELNYX_PHONE_NUMBER,
        'to': `+1${Phone.split('-').join('')}`,
        'text': textBody
      })
      .then(message => {
        prayer.Message_SID = message.data.id;
        prayer.Message_Status = 3;
      })
      .catch(err => {
        // console.log(err)
        prayer.Message_Status = 4;
      })
    
    updatedPrayers.push(prayer)
  }

  // update records in MP
  await axios({
    method: 'put',
    url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
    data: updatedPrayers,
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  })
    .then(() => {
      res.send(updatedPrayers);
    })
    .catch(err => {
      res.status(500).send({error: 'Failed to updated prayer schedules. Try again later.'}).end();
    })

})




router.get('/daily-texts', async (req, res) => {
  const { ids } = req.query;

  if (!ids) return res.status(400).send({error: 'Missing Parameter: ids'}).end();
  
  try {
    const prayer_schedules = await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/Prayer_Schedules',
      params: {
        $select: `Prayer_Schedule_ID, First_name, Phone`,
        $filter: `Cancelled=0 AND Prayer_Schedule_ID IN ${ids}`
      },
      headers: {
        'Content-Type': 'Application/Json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data)

    for (const prayer of prayer_schedules) {
      const { First_name, Phone } = prayer;
      
      // const textBody = `Hi ${First_Name}! It's your time to pray!\nHere are some things to pray about:\n\n${Reminder_Text || defaultPrayerPoints}\n\nAccess the full prayer guide here:\nhttps://rb.gy/clhwr1\n\nThis text reminder is brought to you by We Pray All Day.\nReply 'STOP' to unsubscribe.`;
      const textBody = `Hello ${First_name}! Here's a reminder that your time of prayer is tomorrow. Thank you for being a part of We Pray All Day.\n\nReply 'STOP' to unsubscribe`;
      
      await client.messages
        .create({
          'from': process.env.TELNYX_PHONE_NUMBER,
          'to': Phone,
          'text': textBody
        })
    }

    res.status(200).send({msg: 'Texts sent successfully'}).end();
  } catch (error) {
    console.error(error);
    res.status(500).send({error: 'Internal Server Error'}).end();
  }
})




module.exports = router;