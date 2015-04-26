var util = require('util');
var Node = require('../lib/node');

/**
 * Element represents any node in the scene graph, and provides support for client<->server synchronisation
 * of scene graph data, including the uuid property
 */
function Element () {
  Node.apply(this, arguments);
}

util.inherits(Element, Node);

Element.prototype.removeChild = function () {};

Element.prototype.getReflector = function () {
  return this.ownerDocument.reflector;
};

Object.defineProperties(Element.prototype, {
  uuid: {
    get: function () {
      return this._uuid;
    },
    set: function (value) {
      this._uuid = value.toString();
    }
  }
});

module.exports = Element;
