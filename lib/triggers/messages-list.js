'use strict';

const { promisify } = require('util');
const google = require('googleapis');
const oauth2Client = new google.auth.OAuth2();
const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
});
const listMessages = promisify(gmail.users.messages.list);
const getMessage = promisify(gmail.users.messages.get);
const { messages } = require('elasticio-node');

exports.process = async function processTrigger(msg, cfg, snapshot) {
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

    let result;
    let mostRecentMessage;

    do {
        query.pageToken = result && result.nextPageToken;
        console.log('About to query messages: %j', query);

        result = await listMessages(query);

        console.log('Result: %j', result);
        if (result && result.messages) {
            if (!mostRecentMessage) {
                mostRecentMessage = result.messages[0];
            }

            console.log(`Found ${result.messages.length} messages`);
            this.emit('data', messages.newMessageWithBody(result));
        }
    } while (result && result.nextPageToken);

    if (mostRecentMessage) {
        const message = await getMessage({
            userId: query.userId,
            id: mostRecentMessage.id,
            format: 'metadata'
        });
        console.log('Found most recent message: %j', message);
        //@todo: put message date into the snapshot
    }
};
