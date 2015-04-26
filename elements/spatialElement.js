var util = require('util');
var Element = require('./element');
var Vector = require('../lib/vector');
var Euler = require('../lib/euler');
var Node = require('../lib//node');

/**
 * SpatialElement represents a node the system that has a spatial presence:
 * position, rotation, scale, velocity, mass, material
 */
function SpatialElement () {
  Element.apply(this, arguments);
}

util.inherits(SpatialElement, Element);

Object.defineProperties(SpatialElement.prototype, {
  position: Element.createVectorProperty('position', [0, 0, 0]),
  scale: Element.createVectorProperty('scale', [1, 1, 1]),
  rotation: Element.createEulerProperty('rotation', [0, 0, 0]),
  velocity: Element.createVectorProperty('velocity', [0, 0, 0]),
  mass: Element.createScalarProperty('mass', 0),
  material: {
    get: function () {
      return this['_material'] || (this['_material'] = 'default');
    },
    set: function (value) {
      var v;

      if (typeof value === 'string') {
        this['_material'] = value;

      } else {
        throw new Error('Invalid ' + 'material' + ' argument');
      }
    }
  }
});

module.exports = SpatialElement;
