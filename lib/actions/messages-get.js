'use strict';

const google = require('googleapis');
const oauth2Client = new google.auth.OAuth2();
const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
});
const { promisify } = require('util');
const { messages } = require('elasticio-node');

exports.process = async function processTrigger(msg, cfg) {
    oauth2Client.setCredentials(cfg.oauth);

    const query = msg.body;
    query.userId = query.userId || 'me';

    console.log('Query: %j', query);

    const getMessage = promisify(gmail.users.messages.get);
    const result = await getMessage(query);

    console.log('Result: %j', result);

    return messages.newMessageWithBody(result);
};
