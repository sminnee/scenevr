/**
 * Physics is a scene plugin that manipulates objects in the scene using the
 * Cannon.JS physics engine.
 */

var CANNON = require('cannon');
var Euler = require('../forks/euler');
var Vector = require('../forks/vector');

/**
 * Convert another vector class to a Cannon vector
 */
function cannonVec (vec) {
  return new CANNON.Vec3(vec.x, vec.y, vec.z);
}

function vrVec (vec) {
  return new Vector(vec.x, vec.y, vec.z);
}

function Physics (scene) {
  this.scene = scene;
  this.interval = null;
  this.world = null;

  var self = this;

  // Monkey patch the scene to listen to changes
  var __scene_appendChild = this.scene.appendChild;
  this.scene.appendChild = function (el) {
    var response = __scene_appendChild.apply(self.scene, [el]);
    self.onAppendChild(el);
    return response;
  };
}

Physics.prototype.init = function () {
  var self = this;

  // Create world
  this.world = new CANNON.World();
  this.world.broadphase = new CANNON.NaiveBroadphase();

  this.materials = {
    'default': new CANNON.Material('default')
  };

  // Load all existing nodes, including ones containing physics meta-data
  this.scene.childNodes.forEach(function (node) {
    self.buildNode(node);
  });

  // If there is no physics node, set a default gravity
  if(this.scene.getElementsByTagName('physics').length === 0) {
    self.world.gravity.set(0, -20, 0);
  }

  // Add a ground plane
  // @todo Make the ground plane a part of the scene graph
  var groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: this.materials.ground ? this.materials.ground : this.materials.default
  });
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  this.world.add(groundBody);

  this._inited = true;
};

Physics.prototype.start = function () {
  if(!this._inited) this.init();

  // Start the world loop
  var lastTime = null;
  var world = this.world;

  var frameRate = 50.0; // fps
  var fixedTimeStep = 1.0 / frameRate; // seconds
  var maxSubSteps = 3;

  function loop () {
    var time = new Date().valueOf();
    if (lastTime !== null) {
      var dt = (time - lastTime) / 1000;
      lastTime = time;
      // Apply persistently-applied forces before each step() call
      world.bodies.forEach(function (body) {
        if (body.persistentForce) {
          body.force.copy(body.persistentForce);
        }
      });

      world.step(fixedTimeStep, dt, maxSubSteps);
      world.bodies.forEach(function (body) {
        if (body.updateScene) body.updateScene();
      });

      // This measures actual framerate; was 5-10 on Sam's rMBP, which is concerning
      // console.log(dt*1000,fixedTimeStep*1000);

    } else {
      lastTime = time;
    }
  }

  this.interval = setInterval(loop, fixedTimeStep * 1000);
};

/**
 * Stop the physics engine.
 * Returns true on success, false if it was already stopped
 */
Physics.prototype.stop = function () {
  if (this.interval) {
    clearInterval(this.interval);
    this.interval = null;
    return true;
  } else {
    return false;
  }
};

/**
 * Add the given scene node to the physics engine
 */
Physics.prototype.buildNode = function (el) {
  var self = this;

    // @todo not everything is a box
  switch (el.nodeName) {
  case 'billboard':
  case 'box':
  case 'player':
    var shape = el.nodeName === 'player' ? new CANNON.Sphere(0.5) : new CANNON.Box(cannonVec(el.scale.clone().multiplyScalar(0.5)));

    var body = new CANNON.Body({
      mass: el.mass,
      position: cannonVec(el.position),
      velocity: cannonVec(el.velocity),
      shape: shape,
      material: self.materials[el.material]
    });
    body.quaternion.setFromEuler(el.rotation.x, el.rotation.y, el.rotation.z);

    this.world.addBody(body);

    console.log('Adding ', el.nodeName, ' at ', el.position.x, el.position.y, el.position.z);

    el.body = body;

    el.addPropertyChangeObserver('position', function(position) {
      body.position = cannonVec(position);
    });
    el.addPropertyChangeObserver('rotation', function(rotation) {
      body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    });
    el.addPropertyChangeObserver('scale', function(scale) {
      //throw "Can't mutate scale in real-time yet";
    });
    el.addPropertyChangeObserver('velocity', function(velocity) {
      body.velocity = cannonVec(velocity);
    });
    el.addPropertyChangeObserver('mass', function(mass) {
      body.mass = mass;
    });
    el.addPropertyChangeObserver('material', function(material) {
      if (self.materials[material]) {
        body.material = self.materials[material];
      } else {
        throw 'Bad material name "' + material + '"';
      }
    });

    el.applyImpulse = function (velocity, forcePoint) {
      body.applyImpulse(cannonVec(velocity), cannonVec(forcePoint));
    };
    el.setPersistentForce = function (force) {
      body.persistentForce = cannonVec(force);
    };
    el.clearPersistentForce = function () {
      body.persistentForce = null;
    };

    // Players aren't updated by the server-side physics
    if(el.nodeName !== 'player') {
      body.updateScene = function () {
        if (body.sleepState !== CANNON.Body.SLEEPING) {
          var r = new Euler();
          r.setFromQuaternion(body.quaternion);
          // LOLHACKS
          r.distanceToSquared = Vector.prototype.distanceToSquared;

          var v = vrVec(body.position);
          if (v.distanceToSquared(el.position) > 0.01) {
            el.position = v;
            console.log('updating position of ' + el.nodeName + ' to ' + v);
          }

          var vel = vrVec(body.velocity);
          if (vel.distanceToSquared(el.velocity) > 0.01) el.velocity = vel;

          if (r.distanceToSquared(el.rotation) > 0.01) el.rotation = r;
        }
      };
    }

    break;

  case 'physics':
    // Set gravity
    var gravity = el.gravity;
    this.world.gravity.set(gravity.x, gravity.y, gravity.z);

    // Update gravity
    el.addPropertyChangeObserver('gravity', function(gravity) {
      self.world.gravity.set(gravity.x, gravity.y, gravity.z);
    });
    break;

  case 'material':
    // Add a material
    self.materials[el.name] = new CANNON.Material(el.name);

    el.addPropertyChangeObserver('name', function(name) {
      el.name = name;
      self.materials[name] = el;
    });

    break;

  case 'contactmaterial':
    // Add a material
    self.materials[el.name] = new CANNON.Material(el.name);

    var contactMaterial = new CANNON.ContactMaterial(
      self.materials[el.material1],
      self.materials[el.material2],
      {
        friction: el.friction,
        restitution: el.restitution,
        contactEquationStiffness: el.contactEquationStiffness,
        contactEquationRelaxation: el.contactEquationRelaxation,
        frictionEquationStiffness: el.frictionEquationStiffness,
        frictionEquationRelaxation: el.frictionEquationRegularizationTime
      }
    );

    self.world.addContactMaterial(contactMaterial);

    var properties = [
      'friction',
      'restitution',
      'contactEquationStiffness',
      'contactEquationRelaxation',
      'contactEquationRelaxation',
      'frictionEquationStiffness',
      'frictionEquationRelaxation'
    ];
    properties.forEach(function (property) {
      el.addPropertyChangeObserver(property, function(value) {
        contactMaterial[property] = value;
      });
    });

    el.addPropertyChangeObserver('material1', function(material) {
      contactMaterials.materials[0] = self.materials[el.material];
    });
    el.addPropertyChangeObserver('material2', function(material) {
      contactMaterials.materials[1] = self.materials[el.material];
    });

    break;
  }
};

/**
 * Respond to appendChild mutation events from the scene
 */
Physics.prototype.onAppendChild = function (el) {
  this.buildNode(el);
};

module.exports = Physics;
