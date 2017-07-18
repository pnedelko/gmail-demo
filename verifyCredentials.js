'use strict';

const google = require('googleapis');

module.exports = async function verify(credentials) {
    console.log('Credentials %j', credentials);
    throw new Error('Invalid creds');
};
