'use strict';

const { promisify } = require('util');
const google = require('googleapis');
const oauth2Client = new google.auth.OAuth2();
const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
});
const getMessage = promisify(gmail.users.messages.get);
const { messages } = require('elasticio-node');

exports.process = async function processTrigger(msg, cfg) {
    oauth2Client.setCredentials(cfg.oauth);

    const query = msg.body;
    query.userId = query.userId || 'me';

    console.log('Query: %j', query);

    const result = await getMessage(query);

    const subject = result.payload.headers.find(header => header.name === 'Subject');
    if (subject) {
        console.log('Subject: ', subject.value);
    }

    return messages.newMessageWithBody(result);
};
