'use strict';

/**
 * @module remove-role-command
 * @author Alteh Union (alteh.union@gmail.com)
 * @license MIT (see the root LICENSE file for details)
 */

const DiscordCommand = require('../discord-command');
const CommandArgDef = require('../../command_meta/command-arg-def');
const CommandPermissionFilter = require('../../command_meta/command-permission-filter');
const CommandPermissionFilterField = require('../../command_meta/command-permission-filter-field');
const ArrayArgScanner = require('../../arg_scanners/array-arg-scanner');
const SimpleArgScanner = require('../../arg_scanners/simple-arg-scanner');

const PermissionsManager = require('../../managers/permissions-manager');

const CreateRoleCommandArgDefs = Object.freeze({
  roleNames: new CommandArgDef('roleNames', {
    aliasIds: ['command_createrole_arg_roleNames_alias_roleName', 'command_createrole_arg_roleNames_alias_r'],
    helpId: 'command_createrole_arg_roleNames_help',
    scanner: ArrayArgScanner,
    validationOptions: { nonNull: true }
  }),
  parentRoleName: new CommandArgDef('parentRoleName', {
    aliasIds: ['command_createrole_arg_parentRoleName_alias_roleName', 'command_createrole_arg_parentRoleName_alias_r'],
    helpId: 'command_createrole_arg_parentRoleName_help',
    scanner: SimpleArgScanner,
    validationOptions: {}
  })
});

/**
 * Command to remove specified role from Discord users.
 * @alias RemoveRoleCommand
 * @extends DiscordCommand
 */
class CreateRoleCommand extends DiscordCommand {
  /**
   * Creates an instance for an organization from a source and assigns a given language manager to it.
   * @param  {Context}     context            the Bot's context
   * @param  {string}      source             the source name (like Discord etc.)
   * @param  {LangManager} commandLangManager the language manager
   * @param  {string}      orgId              the organization identifier
   * @return {Command}                        the created instance
   */
  static createForOrg(context, source, commandLangManager, orgId) {
    return new CreateRoleCommand(context, source, commandLangManager, orgId);
  }

  /**
   * Gets the text id of the command's name from localization resources.
   * @return {string} the id of the command's name to be localized
   */
  static getCommandInterfaceName() {
    return 'command_createrole_name';
  }

  /**
   * Gets the array of all arguments definitions of the command.
   * @return {Array<CommandArgDef>} the array of definitions
   */
  getDefinedArgs() {
    return CreateRoleCommandArgDefs;
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
    return langManager.getString('command_createrole_help');
  }

  /**
   * Gets the array of defined Bot's permission filters for the command.
   * Source-defined permissions (e.g. Discord permissions) should be defined in another place.
   * @return {Array<CommandPermissionFilter>} the array of Bot's permission filters
   */
  static getRequiredBotPermissions() {
    return [];
  }

  /**
   * Executes the command instance. The main function of a command, it's essence.
   * All arguments scanning, validation and permissions check is considered done before entering this function.
   * So if any exception happens inside the function, it's considered a Bot's internal problem.
   * @param  {BaseMessage}         message the Discord message as the source of the command
   * @return {Promise<string>}                the result text to be replied as the response of the execution
   */
  async executeForSlack(message) {
    console.log(this.roleNames);
    console.log(this.parentRoleName);

    for (const roleName of this.roleNames) {
      const res = await message.source.client.conversations.create({ is_private: true, name: roleName });
      console.log(res);
    }

    const channels = await message.source.client.conversations.list({ types: 'public_channel,private_channel' });
    console.log(channels);
    return '';

    for (const roleName of this.roleNames) {
      const roleRow = {
        id: roleName,
        source: message.source.name,
        orgId: message.orgId,
        name: roleName
      };
      // TODO: Fix issue with duplicates
      const dbSuccess = this.context.dbManager.rolesTable.insertOrUpdate(roleRow);
      // const dbSuccess = await this.context.dbManager.insertOrUpdate(this.context.dbManager.rolesTable, roleRow);

      if (dbSuccess && this.parentRoleName) {
        const permissionRow = {
          id: 1,
          source: message.source.name,
          orgId: message.orgId,
          subjectType: PermissionsManager.SUBJECT_TYPES.role.name,
          subjectId: roleName,
          permissionType: PermissionsManager.DEFINED_PERMISSIONS.role.name,
          filter: {
            roleId: this.parentRoleName
          }
        };
        await this.context.dbManager.insertOne(this.context.dbManager.permissionsTable, permissionRow);
      }
    }

    return (this.langManager.getString('command_createrole_success', 'TODO'));
  }
}

/**
 * Exports the RemoveRoleCommand class
 * @type {RemoveRoleCommand}
 */
module.exports = CreateRoleCommand;
