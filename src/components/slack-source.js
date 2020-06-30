'use strict';

const Utils = require('./../utils/bot-utils');
const SlackPermissions = require('./slack-permissions');
const BaseSource = require('./base-source');
const BotTable = require('../mongo_classes/bot-table');
const SlackCommandManager = require('../components/slack-commnad-manager');
const MaxTextLength = 40000;

/**
 * Slack source
 */
class SlackSource extends BaseSource {
  constructor(client) {
    super(client);
    this.commandManager = new SlackCommandManager();
    this.permissions = new SlackPermissions();
  }

  /**
   * Reply to the message using the source
   * @param message
   * @param replyText
   * @returns {Promise<void>}
   */
  async replyToMessage(message, replyText) {
    const sendFunction = async function (client, text) {
      return await client.chat.postMessage({ text: text, channel: message.channelId });
    };
    return Utils.splitText(replyText, MaxTextLength).map(text => sendFunction(this.client, text));
  }

  /**
   * String name of the source
   */
  get name() {
    return BotTable.SLACK_SOURCE;
  }

  getCommandPermissions(command) {
    return command.constructor.getRequiredSlackPermissions();
  }

  async executeCommand(command, message) {
    return await command.executeForSlack(message);
  }
}

module.exports = SlackSource;
