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

function createVector (element, x, y, z) {
  var v = new Vector(x, y, z);
  v._element = element;
  return v;
}

function createEuler (element, x, y, z) {
  var e = new Euler(x, y, z);
  e._element = element;
  return e;
}

SpatialElement.prototype._propertyChangeObserverList = [];

/**
 * Add a callback to be called when the given property is chagned.
 * The observer will perform deep-inspection of vector and euler properties
 */
SpatialElement.prototype.addPropertyChangeObserver = function (propName, callback) {
  if(!this._propertyChangeObserverList[propName]) {
    this._propertyChangeObserverList[propName] = [];
  }
  this._propertyChangeObserverList[propName].push(callback);
};

/**
 * Helper function to trigger observer callbacks for a change to the given propName
 */
SpatialElement.prototype._triggerPropertyChange = function (propName) {
  var value = this[propName];
  if(this._propertyChangeObserverList[propName]) {
    this._propertyChangeObserverList[propName].forEach(function (callback) {
      callback(value);
    });
  }
};

/**
 * Return a get/set pair to manage a vector parameter
 * attrName: The name of the property (e.g. 'velocity')
 * defaultValue: A 3-element array representing the default value (e.g. [0, 0, 0])
 */
function createVectorProperty(attrName, defaultValue) {
  var privateProperty = '_'+attrName;
  return {
    get: function () {
      if(!this[privateProperty]) {
        var self = this;
        this[privateProperty] = createVector(this, defaultValue[0], defaultValue[1], defaultValue[2]);
        // Add change observer for deep change inspection
        this[privateProperty].addChangeObserver(function () {
          self._triggerPropertyChange(attrName);
        });
      }
      return this[privateProperty];
    },
    set: function (value) {
      var v;

      if (value instanceof Vector) {
        this[privateProperty] = createVector(this).copy(value);
      } else if (typeof value === 'string') {
        v = createVector(this).fromArray(value.split(' ').map(parseFloat));

        if (isFinite(v.length())) {
          this[privateProperty] = v;
        } else {
          throw new Error('Invalid ' + attrName + ' argument');
        }
      } else {
        throw new Error('Invalid ' + attrName + ' argument');
      }

      // Add change observer for deep change inspection
      var self = this;
      this[privateProperty].addChangeObserver(function () {
        self._triggerPropertyChange(attrName);
      });

      // Trigger change observers
      this._triggerPropertyChange(attrName);
    }
  };
}

/**
 * Return a get/set pair to manage a euler parameter
 * attrName: The name of the property (e.g. 'velocity')
 * defaultValue: A 3-element array representing the default value (e.g. [0, 0, 0])
 */
function createEulerProperty(attrName, defaultValue) {
  var privateProperty = '_'+attrName;
  return {
    get: function () {
      if(!this[privateProperty]) {
        var self = this;
        this[privateProperty] = createEuler(this, defaultValue[0], defaultValue[1], defaultValue[2]);
        // Add change observer for deep change inspection
        this[privateProperty].addChangeObserver(function () {
          self._triggerPropertyChange(attrName);
        });
      }
      return this[privateProperty];
    },
    set: function (value) {
      var v;

      if (value instanceof Euler) {
        this[privateProperty] = createEuler(this).copy(value);
      } else if (typeof value === 'string') {
        v = createEuler(this).fromArray(value.split(' ').map(parseFloat));

        if (isFinite(v.x) && isFinite(v.y) && isFinite(v.z)) {
          this[privateProperty] = v;
        } else {
          throw new Error('Invalid ' + attrName + ' argument');
        }
      } else {
        throw new Error('Invalid ' + attrName + ' argument');
      }

      // Add change observer for deep change inspection
      var self = this;
      this[privateProperty].addChangeObserver(function () {
        self._triggerPropertyChange(attrName);
      });

      // Trigger change observers
      this._triggerPropertyChange(attrName);
    }
  };
}

/**
 * Return a get/set pair to manage a scalar parameter
 * attrName: The name of the property (e.g. 'mass')
 * defaultValue: A float representing the default value
 */
function createScalarProperty(attrName, defaultValue) {
  var privateProperty = '_'+attrName;
  return {
    get: function () {
      return this[privateProperty] || (this[privateProperty] = defaultValue);
    },
    set: function (value) {
      var v;

      if (typeof value === 'number') {
        this[privateProperty] = value;

      } else if (typeof value === 'string') {
        v = parseFloat(value);

        if(!isNaN(v)) {
         this[privateProperty] = v;
        } else {
          throw new Error('Invalid ' + attrName + ' argument');
        }
        
      } else {
        throw new Error('Invalid ' + attrName + ' argument');
      }

      // Trigger change observers
      this._triggerPropertyChange(attrName);
    }
  };
}


Object.defineProperties(SpatialElement.prototype, {
  position: createVectorProperty('position', [0, 0, 0]),
  scale: createVectorProperty('scale', [1, 1, 1]),
  rotation: createEulerProperty('rotation', [0, 0, 0]),
  velocity: createVectorProperty('velocity', [0, 0, 0]),
  mass: createScalarProperty('mass', 0),
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
