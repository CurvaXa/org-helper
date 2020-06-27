'use strict';

class Permissions {
  get admin() {
    throw new Error(`${this.constructor.name} is an abstract class`);
  }

  get allPermissions() {
    throw new Error(`${this.constructor.name} is an abstract class`);
  }
}

module.exports = Permissions;
