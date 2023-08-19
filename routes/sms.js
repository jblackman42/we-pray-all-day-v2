const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);

router.post('/', async (req, res) => {
  const { phone_numbers } = req.body;

  if (!phone_numbers || !phone_numbers.length) return res.status(400).send({error: 'Missing Parameters: phone_numbers'}).end();

  try {
    const messages = [];
    for (const number of phone_numbers) {
      const currMessage = await telnyx.messages.create({
        'from': process.env.TELNYX_PHONE_NUMBER,
        'to': number,
        'text': `Hi [Name]! It's your time to pray!\n\nAccess the prayer guide here:\nweprayallday.com/guide\n\nThis text reminder is brought to you by We Pray All Day.\nReply 'STOP' to unsubscribe.`
      })
      .then(message => message)

      messages.push(currMessage)
    }

    res.status(200).send(messages).end();
  } catch (error) {
    console.log(error);
    res.status(500).send({error: error}).end();
  }
})

router.get('/lookup/:id', async (req, res) => {
  const { id } = req.params;

  const phone_number = await client.lookups.v2.phoneNumbers(id).fetch()
    .then(phone_number => phone_number);

  res.send(phone_number)
})

module.exports = router;