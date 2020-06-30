'use strict';

const BaseMessage = require('./base-message');

/**
 * Wrapper for a source specific message
 */
class SlackMessage extends BaseMessage {

  get orgId() {
    return this.originalMessage.team;
  }

  get channelId() {
    return this.originalMessage.channel;
  }

  get userId() {
    return this.originalMessage.user;
  }

  get content() {
    return this.originalMessage.text;
  }

  get member() {
    return this.originalMessage.user;
  }

  get channel() {
    return this.originalMessage.channel;
  }

}

module.exports = SlackMessage;
