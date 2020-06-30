'use strict';

const Permissions = require('./permissions');

const ALL_PERMISSIONS = Object.freeze({
  ADMINISTRATOR: 'ADMINISTRATOR'
});

class DiscordPermissions extends Permissions {
  static get ADMINISTRATOR() {
    return ALL_PERMISSIONS.ADMINISTRATOR;
  }

  static get ALL_PERMISSIONS() {
    return ALL_PERMISSIONS;
  }

  hasPermissionInChannel(member, channel, permission) {
    return true;

  }

  getCommandPermissions(command) {
    return command.constructor.getRequiredSlackPermissions();
  }

  getMemberRoleIds(member) {
    return [];
  }


}

module.exports = DiscordPermissions;
