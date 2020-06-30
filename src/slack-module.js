'use strict';


const SlackMessage = require('./components/slack-message');
const SlackSource = require('./components/slack-source');
const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');

class SlackModule {
  constructor(context) {
    this.c = context;
    this.client = new WebClient(this.c.prefsManager.slack_token);
  }

  run() {
    const slackSource = new SlackSource(this.client);

    const slackEvents = createEventAdapter(this.c.prefsManager.slack_signing_secret);

    const slackServerPort = this.c.prefsManager.slack_server_port;

    slackEvents.on('message', async (slackMessage) => {
      console.log(slackMessage);
      const message = new SlackMessage(slackMessage, slackSource);
      try {
        const processed = await this.c.commandsParser.processMessage(message);
        if (!processed) {
          this.c.messageModerator.premoderateDiscordMessage(message);
        }
      } catch (error) {
        this.c.log.e('client on message error: ' + error + '; stack: ' + error.stack);
      }
    });

    // All errors in listeners are caught here. If this weren't caught, the program would terminate.
    slackEvents.on('error', (error) => {
      console.log(error.name); // TypeError
    });

    (async () => {
      const server = await slackEvents.start(slackServerPort);
      console.log(`Listening for events on ${server.address().port}`);
    })();

  }
}

module.exports = SlackModule;
