const axios = require('axios');
const qs = require('qs');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail'); //emailing
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY); //texting

const getAccessToken = async () => {
  const data = await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
      data: qs.stringify({
          grant_type: "client_credentials",
          scope: "http://www.thinkministry.com/dataplatform/scopes/all",
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
      })
  })
      .then(response => response.data)
      .catch(err => {
        console.log(err.response.status)
        return {
          access_token: null,
          expires_in: null
        }
      })
  const {access_token, expires_in} = data;
  return access_token;
}

const MP = {
  findOne: async (searchParams) => {
    const filterArr = [];
    
    for (const key in searchParams) {
      if (searchParams.hasOwnProperty(key)) {
        const value = searchParams[key];
        const filter = `${key} = '${value}'`;
        filterArr.push(filter);
      }
    }
    
    const searchQuery = filterArr.join(' AND ');

    return await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/PCA_Users',
      headers: {
        'Content-Type': 'Application/JSON',
        'Authorization': 'Bearer ' + await getAccessToken()
      },
      params: {
        $filter: searchQuery
      }
    })
      .then(response => response.data[0] ?? null)
      .catch(err => console.log(err.response.status))
  },
  findByGUID: async (guid) => {
    if (guid.length != 36) {
      return null;
    }
    // console.log(guid)
    return await axios({
      method: 'get',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/PCA_Users',
      headers: {
        'Content-Type': 'Application/JSON',
        'Authorization': 'Bearer ' + await getAccessToken()
      },
      params: {
        $filter: `_User_GUID='${guid}'`
      }
    })
      .then(response => response.data[0] ?? null)
      .catch(err => {
        // console.log(err.response.status)
        return null;
      })
  },
  findByID: async (id) => {
    if (!id) return null;
    return await axios({
      method: 'get',
      url: `https://my.pureheart.org/ministryplatformapi/tables/PCA_Users/${id}`,
      headers: {
        'Content-Type': 'Application/JSON',
        'Authorization': 'Bearer ' + await getAccessToken()
      }
    })
      .then(response => response.data[0] ?? null)
      .catch(err => {
        // console.log(err.response.status)
        return null;
      })
  },
  hashPassword: (input) => {
    let hash = CryptoJS.MD5(input);
    let base64 = CryptoJS.enc.Base64.stringify(hash);
    return base64;
  },
  compare: (inputPassword, storedPassword) => {
    const hash1 = MP.hashPassword(inputPassword);
    const hash2 = storedPassword;

    const buffer1 = Buffer.from(hash1, 'base64');
    const buffer2 = Buffer.from(hash2, 'base64');
    
    if (buffer1.length !== buffer2.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(buffer1, buffer2);
  },
  generateTimeBasedCode: () => {
    const date = new Date();
    const fullYear = date.getFullYear();
    const month = date.getMonth() + 1;  // getMonth returns 0-11, adding 1 to make it 1-12
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const rawCode = fullYear * month * day * hours * minutes * seconds;

    return String(rawCode).substring(0, 6);
  },
  sendEmail: async (toEmail, subject, emailBodyHTML, emailBodyText) => {
    try {
      // Define the email data
      const msg = {
        to: toEmail, // Change to your recipient
        from: 'noreply@pureheart.org', // Change to your verified sender
        subject: subject,
        text: emailBodyText,
        html: emailBodyHTML,
      };
  
      return await sgMail
        .send(msg)
        .then(emailData => emailData[0].statusCode)
    } catch (err) {
      // console.log(err)
      return null
    }
  },
  getWPADEmailTemplate: (First_Name, DateString, TimeString, Dates) => {
    return `
    <style>
      body, html {margin: 0;padding: 0;font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;}.container {max-width: 768px;margin: 0 auto;background-color: #f1f2f6;}.container .img-container {background-color: #2e2d2b;color: white;display: grid;place-items: center;font-size: 1.2rem;padding: 1rem;}.container .img-container img {width: 300px;max-width: 90%;margin: 0 auto;}.container .img-container p {margin: 0;font-weight: bold;}.container #banner {width: 100%;background: #fcbb09;color: white;margin: 0;padding: 1rem 0;text-align: center;text-transform: uppercase;font-weight: bold;}.container .content {max-width: 90%;margin: 0 auto;padding: 1rem;}.container .content p {margin: 0;}.container .btn-container {width: 100%;display: flex;justify-content: center;}.container a {text-decoration: none;font-size: 1rem;font-weight: bold;border: none;color: white;background-color: #fcbb09;padding: .5rem 1rem;border-radius: 4px;cursor: pointer;}.date-info {width: max-content;margin: 0 auto;}
    </style>
    <body>
      <div class="container">
        <div class="img-container"><img src="http://weprayallday.com/assets/final-logo-transparent.png" alt="We Pray All Day"></div>
        <p id="banner">Thanks for signing up to pray</p>
        <div class="content"><p>Hi ${First_Name},</p><br><p>We are so honored that you would pray with us! We have high expectations that God is going to do immeasurably more than we could ever seek ask or imagine!</p><br><p>To help you remember your prayer time, add this to your calendar! It's simple all you gotta do is click it and accept</p><br><p>We will text you 5 minutes before your scheduled time of prayer with more information.</p><br><p style="text-align: center;">${TimeString}</p><div class="date-info"><p>${DateString}</p></div><br><div class="btn-container"><a href="${process.env.DOMAIN_NAME}/calendar-invite/?dates=${Dates.toString()}" target="_blank">Add to Calendar</a></div></div>
      </div>
    </body>
    `
  },
  formatDate: (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }
}

module.exports = {
  MP,
  getAccessToken
};