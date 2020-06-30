'use strict';

const BaseMessage = require('./base-message');

/**
 * Wrapper for a source specific message
 */
class DiscordMessage extends BaseMessage
{
  get orgId() {
    return this.originalMessage.guild ? this.originalMessage.guild.id : null;
  }

  get channelId() {
    return this.originalMessage.channel ? this.originalMessage.channel.id : null;
  }

  get userId() {
    return this.originalMessage.author ? this.originalMessage.author.id : null;
  }

  get content() {
    return this.originalMessage.content;
  }

  get member() {
    return this.originalMessage.member;
  }

  get channel() {
    return this.originalMessage.channel;
  }

}

module.exports = DiscordMessage;
