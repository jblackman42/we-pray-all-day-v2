const axios = require('axios');
const qs = require('qs');

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

const ensureAuthenticated = async (req, res, next) => {
    const logging = 0;

    const {user, access_token, refresh_token} = req.session;

    if (!user || !access_token) {
        if (logging) console.log('no token')
        // kick em out
        return res.render('pages/login', {error: ''});
    };

    // checks if current access token is valid
    const isValid = await axios({
        method: 'post',
        url: `${process.env.BASE_URL}/oauth/connect/accesstokenvalidation`,
        data: qs.stringify({
            'token': req.session.access_token
        })
    })
        .then(response => {
            const {exp} = response.data;
            return new Date() < new Date(exp * 1000)
        })
        .catch(err => {
            // console.log(err)
            return false;
        })

    if (isValid) {
        if (logging) console.log('valid token')
        return next()
    };
    if (logging) console.log('invalid token')
    // if token is not valid, use refresh token to get a new one
    
    const newAccessToken = await axios({
        method: 'post',
        url: `${process.env.BASE_URL}/oauth/connect/token`,
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`
        },
        data: qs.stringify({
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        })
    })
        .then(response => response.data.access_token)
        .catch(err => {
            console.log('something went wrong: ' + err);
            return false;
        })

    if (logging) console.log('new token')

    if (newAccessToken) {
        req.session.access_token = newAccessToken;
        return next();
    } else {
        return res.render('pages/login', {error: 'internal server error'})
    }
}

const ensurePrayerLeader = async (req, res, next) => {
    const { user } = req.session;
    if (!user || !user.userid) {
        return res.render('pages/login', { error: 'invalid user' });
    }

    try {
        const accessToken = await getAccessToken();
        const response = await axios({
            url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Authorized_Users',
            params: {
                $filter: `user_ID = ${user.userid}`
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.data.length === 0) {
            return res.render('pages/login', { error: 'unauthorized' });
        }

        next();
    } catch (error) {
        console.error("Authorization error: ", error);
        return res.render('pages/login', { error: 'internal server error' });
    }
}

const ensurePrayerLeaderByID = async (req, res, next) => {
    const { user } = req.session;
    const { id } = req.params;
    if (!user || !user.userid || !parseInt(id)) {
        return res.status(401).send({error: 'unauthorized'}).end();
    }

    try {
        const accessToken = await getAccessToken();
        const response = await axios({
            url: 'https://my.pureheart.org/ministryplatformapi/tables/WPAD_Authorized_Users',
            params: {
                $filter: `user_ID = ${user.userid} AND WPAD_Community_ID = ${parseInt(id)}`
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.data.length === 0) {
            return res.render('pages/login', { error: 'unauthorized' });
        }

        next();
    } catch (error) {
        console.error("Authorization error: ", error);
        return res.render('pages/login', { error: 'internal server error' });
    }
}

module.exports = {
    ensureAuthenticated,
    ensurePrayerLeader,
    ensurePrayerLeaderByID
}