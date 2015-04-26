/**
 * Physics is a scene plugin that manipulates objects in the scene using the
 * Cannon.JS physics engine.
 */

var CANNON = require('cannon');
var Euler = require('../forks/euler');
var Vector = require('../forks/vector');

// Different materials to use
var materials = {
  'ground': new CANNON.Material('ground'),
  'normal': new CANNON.Material('normal'),
  'vehicle': new CANNON.Material('object')
};

// Parameters for the interactions between different materials
var materialInteractions = [
  new CANNON.ContactMaterial(materials.ground, materials.normal, {
      friction: 0.4,
      restitution: 0.3,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
      frictionEquationStiffness: 1e8,
      frictionEquationRegularizationTime: 3
  }),
  new CANNON.ContactMaterial(materials.ground, materials.vehicle, {
      friction: 0.002,
      restitution: 0.3,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3
  }),
  new CANNON.ContactMaterial(materials.vehicle, materials.normal, {
      friction: 0.4,
      restitution: 0.3,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3
  })
];

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

  var $p = this;
  var $s = scene;

  // Monkey patch the scene to listen to changes
  var __scene_appendChild = this.scene.appendChild;
  this.scene.appendChild = function (el) {
    var response = __scene_appendChild.apply($s, [el]);
    $p.onAppendChild(el);
    return response;
  };
}

Physics.prototype.start = function () {
  var $p = this;

  // Create world
  this.world = new CANNON.World();
  this.world.gravity.set(0, -20, 0); // m/s²
  this.world.broadphase = new CANNON.NaiveBroadphase();

  materialInteractions.forEach(function (contactMaterial) {
    $p.world.addContactMaterial(contactMaterial);
  });

  // Add a ground plane
  // @todo Make the ground plane a part of the scene graph
  var groundShape = new CANNON.Plane();

  var groundBody = new CANNON.Body({
    mass: 0,
    shape: groundShape,
    material: materials.ground
  });

  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  this.world.add(groundBody);

  // Load all other existing nodes
  this.scene.childNodes.forEach(function (node) {
    $p.buildNode(node);
  });

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
    // @todo not everything is a box
  switch (el.nodeName) {
  case 'billboard':
  case 'box':
  case 'player':
    var shape = el.nodeName === 'player' ? new CANNON.Sphere(0.5) : new CANNON.Box(cannonVec(el.scale.clone().multiplyScalar(0.5)));

    var body = new CANNON.Body({
      mass: el.nodeName === 'player' ? 100 : 5, // kg
      position: cannonVec(el.position),
      shape: shape,
      material: materials.normal
    });
    this.world.addBody(body);

    console.log('Adding ', el.nodeName, ' at ', el.position.x, el.position.y, el.position.z);

    el.body = body;

    // To do: replace this with a DOM Mutation Observer
    el.setX = function (x) {
      el.position.x = body.position.x = x;
    };
    el.setY = function (y) {
      el.position.y = body.position.y = y;
    };
    el.setZ = function (z) {
      el.position.z = body.position.z = z;
    };

    el.applyImpulse = function (velocity, forcePoint) {
      body.applyImpulse(cannonVec(velocity), cannonVec(forcePoint));
    };
    el.setPersistentForce = function (force) {
      body.persistentForce = cannonVec(force);
    };
    el.clearPersistentForce = function () {
      body.persistentForce = null;
    };

    el.setMaterial = function (material) {
      if (materials[material]) {
        body.material = materials[material];
      } else {
        throw 'Bad material name "' + material + '"';
      }
    };

    el.setVelocity = function (velocity) {
      // Process string representation of velocity
      if (typeof velocity === 'string') {
        velocity = velocity.split(' ');
        // console.log(velocity);
        velocity = { x: parseFloat(velocity[0]), y: parseFloat(velocity[1]), z: parseFloat(velocity[2]) };
      }

      el.velocity = velocity;
      body.velocity = cannonVec(velocity);
    };

    body.updateScene = function () {
      if (body.sleepState !== CANNON.Body.SLEEPING) {
        var r = new Euler();
        r.setFromQuaternion(body.quaternion);
        // LOLHACKS
        r.distanceToSquared = Vector.prototype.distanceToSquared;
        var v = vrVec(body.position);

        if (v.distanceToSquared(el.position) > 0.01) el.position = v;
        if (r.distanceToSquared(el.rotation) > 0.01) el.rotation = r;
      }
    };

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
