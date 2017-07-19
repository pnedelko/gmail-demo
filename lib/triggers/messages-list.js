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

    const query = {
        userId: cfg.userId || 'me',
        includeSpamTrash: Boolean(cfg.includeSpamTrash),
        maxResults: cfg.maxResults || 100
    };

    if (cfg.labelIds) {
        query.labelIds = cfg.labelIds;
    }

    if (cfg.q) {
        query.q = cfg.q;
    }

    if (cfg.fields) {
        query.fields = cfg.fields;
    }

    console.log('Query: %j', query);

    const listMessages = promisify(gmail.users.messages.list);
    const result = await listMessages(query);

    console.log('Result: %j', result);

    return messages.newMessageWithBody(result);
};
