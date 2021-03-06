'use strict';

/**
 * @module empty-locale
 * @author Alteh Union (alteh.union@gmail.com)
 * @license MIT (see the root LICENSE file for details)
 */

const TestCase = require('../../components/test-case');

/**
 * Checks that the Bot does not allow empty locale for the server setting.
 * @extends TestCase
 * @alias EmptyLocale
 */
class EmptyLocale extends TestCase {
  /**
   * Executes the test case
   * @return {Promise} nothing (in case of failure - an exception will be thrown)
   */
  async execute() {
    super.execute();

    const discordClient = this.processor.discordClient;
    this.assertNotNull(discordClient);
    const guild = discordClient.guilds.cache.get(this.processor.prefsManager.test_discord_guild_id);
    this.assertNotNull(guild);
    const channel = guild.channels.cache.get(this.processor.prefsManager.test_discord_text_channel_1_id);
    this.assertNotNull(channel);

    channel.send('!setlocale');
    const receivedMessage = await this.getReply(channel);
    this.assertNotNull(receivedMessage);
    this.assertTrue(receivedMessage.content.startsWith(
      'Sorry, could not understand the command. Reason: You did not specify any value for argument:'));
  }
}

/**
 * Exports the EmptyLocale class
 * @type {EmptyLocale}
 */
module.exports = EmptyLocale;
