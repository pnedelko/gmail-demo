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
const refreshAccessToken = promisify(oauth2Client.refreshAccessToken).bind(oauth2Client);
const { messages } = require('elasticio-node');

exports.process = async function processTrigger(msg, cfg, snapshot) {
    oauth2Client.setCredentials(cfg.oauth);

    oauth2Client.refreshAccessToken((err, tokens) => {
        console.log('New tokens: %j', tokens);
    });

    // const tokens = await refreshAccessToken();
    // this.emit('updateKeys', {
    //     oauth: tokens
    // });

    console.log('Got snapshot: %j', snapshot);

    const query = {
        userId: cfg.userId || 'me',
        includeSpamTrash: Boolean(cfg.includeSpamTrash),
        maxResults: cfg.maxResults || 100,
        q: cfg.q || ''
    };

    if (cfg.labelIds) {
        query.labelIds = cfg.labelIds;
    }

    if (cfg.fields) {
        query.fields = cfg.fields;
    }

    if (snapshot.latestMessageDate) {
        const unixTimestamp = Math.round(Number(snapshot.latestMessageDate) / 1000) + 1;
        query.q = `${query.q} after:${unixTimestamp}`;
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
        snapshot.latestMessageDate = message.internalDate;
        console.log('Emitting new snapshot: %j', snapshot);
        this.emit('snapshot', snapshot);
    }
};
