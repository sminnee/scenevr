var util = require('util');
var Element = require('./element');

function ContactMaterial () {
  Element.call(this, 'contactmaterial');
}

util.inherits(ContactMaterial, Element);

ContactMaterial.prototype.reflect = true;

Object.defineProperties(ContactMaterial.prototype, {
  material1: Element.createStringProperty('material1', 'default'),
  material2: Element.createStringProperty('material2', 'default'),
  friction: Element.createScalarProperty('friction', 0.3),
  restitution: Element.createScalarProperty('restitution', 0.3),
  contactEquationStiffness: Element.createScalarProperty('contactEquationStiffness', 1e7),
  contactEquationRelaxation: Element.createScalarProperty('contactEquationRelaxation', 3),
  frictionEquationStiffness: Element.createScalarProperty('frictionEquationStiffness', 1e7),
  frictionEquationRegularizationTime: Element.createScalarProperty('frictionEquationRelaxation', 3)
});

module.exports = ContactMaterial;
