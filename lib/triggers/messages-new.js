'use strict';

const { promisify } = require('util');
const google = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
);
const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
});
const listMessages = promisify(gmail.users.messages.list);
const getMessage = promisify(gmail.users.messages.get);
const listHistory = promisify(gmail.users.history.list);
const { newMessageWithBody } = require('elasticio-node').messages;

exports.process = async function processTrigger(msg, cfg, snapshot) {
    oauth2Client.setCredentials(cfg.oauth);

    if (snapshot.latestHistoryId) {
        const query = {
            userId: 'me',
            historyTypes: 'messageAdded',
            startHistoryId: snapshot.latestHistoryId
        };

        let result;

        do {
            query.pageToken = result && result.nextPageToken;
            console.log('About to query history: %j', query);

            result = await listHistory(query);
            snapshot.latestHistoryId = result.historyId;
            console.log('Emitting new snapshot: %j', snapshot);
            this.emit('snapshot', snapshot);

            if (result.history) {
                const { history } = result;
                console.log(`Found ${history.length} history items`);
                const messages = history.reduce((arr, historyItem) => arr.concat(historyItem.messages), []);
                console.log(`Found ${messages.length} messages`);
                this.emit('data', newMessageWithBody({
                    messages
                }));
            }
        } while (result && result.nextPageToken);
    } else {
        const query = {
            userId: 'me'
        };

        let result;
        let mostRecentMessage;

        do {
            query.pageToken = result && result.nextPageToken;
            console.log('About to query messages: %j', query);

            result = await listMessages(query);

            if (result && result.messages) {
                const { messages } = result;

                if (!mostRecentMessage) {
                    mostRecentMessage = messages[0];
                }

                console.log(`Found ${messages.length} messages`);
                this.emit('data', newMessageWithBody({
                    messages
                }));
            }
        } while (result && result.nextPageToken);

        if (mostRecentMessage) {
            const message = await getMessage({
                userId: query.userId,
                id: mostRecentMessage.id,
                format: 'metadata'
            });
            console.log('Found most recent message: %j', message);
            // snapshot.latestMessageDate = message.internalDate;
            snapshot.latestHistoryId = message.historyId;
            console.log('Emitting new snapshot: %j', snapshot);
            this.emit('snapshot', snapshot);
        }
    }
};
