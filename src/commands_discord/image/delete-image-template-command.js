'use strict';

/**
 * @module delete-image-template-command
 * @author Alteh Union (alteh.union@gmail.com)
 * @license MIT (see the root LICENSE file for details)
 */

const DiscordCommand = require('../discord-command');
const ArrayArgScanner = require('../../arg_scanners/array-arg-scanner');

const ListImageTemplatesCommand = require('./list-image-templates-command');

const CommandArgDef = require('../../command_meta/command-arg-def');
const CommandPermissionFilter = require('../../command_meta/command-permission-filter');

const PermissionsManager = require('../../managers/permissions-manager');

const DeleteImageTemplateCommandArgDefs = Object.freeze({
  ids: new CommandArgDef('ids', {
    aliasIds: ['command_deleteimagetemplate_arg_ids_alias_ids', 'command_deleteimagetemplate_arg_ids_alias_i'],
    helpId: 'command_deleteimagetemplate_arg_ids_help',
    scanner: ArrayArgScanner,
    validationOptions: { isArray: true }
  })
});

/**
 * Command to delete image templates according to their ids in the Discord server.
 * @alias DeleteImageTemplateCommand
 * @extends DiscordCommand
 */
class DeleteImageTemplateCommand extends DiscordCommand {
  /**
   * Creates an instance for an organization from a source and assigns a given language manager to it.
   * @param  {Context}     context            the Bot's context
   * @param  {string}      source             the source name (like Discord etc.)
   * @param  {LangManager} commandLangManager the language manager
   * @param  {string}      orgId              the organization identifier
   * @return {Command}                        the created instance
   */
  static createForOrg(context, source, commandLangManager, orgId) {
    return new DeleteImageTemplateCommand(context, source, commandLangManager, orgId);
  }

  /**
   * Gets the text id of the command's name from localization resources.
   * @return {string} the id of the command's name to be localized
   */
  static getCommandInterfaceName() {
    return 'command_deleteimagetemplate_name';
  }

  /**
   * Gets the array of all arguments definitions of the command.
   * @return {Array<CommandArgDef>} the array of definitions
   */
  static getDefinedArgs() {
    return DeleteImageTemplateCommandArgDefs;
  }

  /**
   * Gets the help text for the command (excluding the help text for particular arguments).
   * The lang manager is basically the manager from the HelpCommand's instance.
   * @see HelpCommand
   * @param  {Context}     context     the Bot's context
   * @param  {LangManager} langManager the language manager to localize the help text
   * @return {string}                  the localized help text
   */
  static getHelpText(context, langManager) {
    return langManager.getString(
      'command_deleteimagetemplate_help',
      langManager.getString(ListImageTemplatesCommand.getCommandInterfaceName())
    );
  }

  /**
   * Gets the array of defined Bot's permission filters for the command.
   * Source-defined permissions (e.g. Discord permissions) should be defined in another place.
   * @return {Array<CommandPermissionFilter>} the array of Bot's permission filters
   */
  static getRequiredBotPermissions() {
    return [
      new CommandPermissionFilter(PermissionsManager.DEFINED_PERMISSIONS.imagetemplate.name, [])
    ];
  }

  /**
   * Executes the command instance. The main function of a command, it's essence.
   * All arguments scanning, validation and permissions check is considered done before entering this function.
   * So if any exception happens inside the function, it's considered a Bot's internal problem.
   * @param  {BaseMessage}         message the Discord message as the source of the command
   * @return {Promise<string>}             the result text to be replied as the response of the execution
   */
  async executeForDiscord(message) {
    // Inherited function with various possible implementations, some args may be unused.
    /* eslint no-unused-vars: ["error", { "args": "none" }] */
    const templates = await this.context.dbManager.getDiscordRows(
      this.context.dbManager.imageTemplateTable, this.orgId);
    const templateIds = new Set(templates.map(a => a.id));
    const templateIdsToDelete = [];

    for (const idToDelete of this.ids) {
      if (templateIds.has(idToDelete)) {
        templateIdsToDelete.push(idToDelete);
      }
    }

    if (templateIdsToDelete.length === 0) {
      return this.langManager.getString('command_deleteimagetemplate_no_ids_found');
    }

    const orArray = [];
    for (const templateIdToDelete of templateIdsToDelete) {
      orArray.push({ id: templateIdToDelete });
    }

    const deleteQuery = { $or: orArray };
    await this.context.dbManager.deleteDiscordRows(this.context.dbManager.imageTemplateTable, this.orgId, deleteQuery);

    return this.langManager.getString('command_deleteimagetemplate_success');
  }
}

/**
 * Exports the DeleteImageTemplateCommand class
 * @type {DeleteImageTemplateCommand}
 */
module.exports = DeleteImageTemplateCommand;
