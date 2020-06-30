'use strict';

/**
 * Wrapper for a source specific message
 */
class BaseMessage {
  /**
   * @param {?} originalMessage
   * @param {BaseSource} source
   */
  constructor(originalMessage, source) {
    this.originalMessage = originalMessage;
    this.source = source;
  }

  /**
   * Simple reply to a message with a text
   * @param text
   * @returns {Promise<void>}
   */
  async reply(text) {
    this.source.replyToMessage(this, text);
  }
}

module.exports = BaseMessage;
