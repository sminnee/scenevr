var util = require('util');
var Element = require('./element');

function Physics () {
  Element.call(this, 'physics');
}

util.inherits(Physics, Element);

Physics.prototype.reflect = true;

Object.defineProperties(Physics.prototype, {
  gravity: Element.createVectorProperty('gravity', [0, 0, 0]),
});

module.exports = Physics;
