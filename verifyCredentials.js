'use strict';

const google = require('googleapis');
const gmail = google.gmail('v1');
const oauth2Client = new google.auth.OAuth2();
const { promisify } = require('util');

module.exports = async function verify(credentials) {
    console.log('Credentials %j', credentials);

    oauth2Client.setCredentials(credentials.oauth);

    const getProfile = promisify(gmail.users.getProfile);
    const result = await getProfile({
        userId: 'me',
        auth: oauth2Client
    });

    console.log('Profile: %j', result);

    return result;
};
