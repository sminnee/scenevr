var util = require('util');
var Element = require('../lib/element');
var Spawn;

function Spawn () {
  Element.call(this, 'spawn');
}

util.inherits(Spawn, Element);

Spawn.prototype.reflect = true;

module.exports = Spawn;
