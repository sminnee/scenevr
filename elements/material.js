var util = require('util');
var Element = require('./element');

function Material () {
  Element.call(this, 'material');
}

util.inherits(Material, Element);

Material.prototype.reflect = true;

Object.defineProperties(Material.prototype, {
  name: Element.createStringProperty('name', [0, 0, 0]),
});

module.exports = Material;
