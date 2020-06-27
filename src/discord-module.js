'use strict';

const BaseMessage = require('./components/base-message');
const DiscordSource = require('./components/discord-source');

class DiscordModule {
  constructor(context) {
    this.c = context;
    this.client = context.discordClient;
  }

  run() {
    const discordSource = new DiscordSource(this.client);

    this.client.on('ready', async () => {
      try {
        this.c.log.i('Servers:');
        const guildsArray = this.client.guilds.cache.array();
        const updateResults = [];
        for (const guild of guildsArray) {
          this.c.log.i(' - ' + guild.name);
          updateResults.push(this.c.dbManager.updateGuild(guild));
        }

        await Promise.all(updateResults);
        await this.c.dbManager.updateGuilds(this.client.guilds.cache);

        this.c.discordClientReady = true;

        await this.c.scheduler.syncTasks();
      } catch (error) {
        this.c.log.f('client on ready error: ' + error + '; stack: ' + error.stack);
      }
    });

    this.client.on('message', async discordMessage => {
      if (!this.c.discordClientReady) {
        this.c.log.w('on message: the client is not ready');
        return;
      }

      try {
        const message = BaseMessage.createFromDiscord(discordMessage, discordSource);
        await this.c.dbManager.updateGuilds(this.client.guilds.cache);
        await this.c.scheduler.syncTasks();

        if (message.originalMessage.guild !== undefined && message.originalMessage.guild !== null) {
          await this.c.dbManager.updateGuild(message.originalMessage.guild);

          let processed = false;
          if (message.userId !== this.client.user.id) {
            processed = await this.c.commandsParser.processMessage(message);
            if (!processed) {
              this.c.messageModerator.premoderateDiscordMessage(message);
            }
          }
        } else {
          // The null guild means it's a private ("DM") message
          await this.c.commandsParser.parsePrivateDiscordCommand(message);
        }
      } catch (error) {
        this.c.log.e('client on message error: ' + error + '; stack: ' + error.stack);
      }
    });

    this.client.login(this.c.prefsManager.discord_token);
  }
}

module.exports = DiscordModule;
