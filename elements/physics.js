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
  this.world.gravity.set(0, -9.82, 0); // m/s²
  this.world.broadphase = new CANNON.NaiveBroadphase();

  // Add a ground plane
  // @todo Make the ground plane a part of the scene graph
  var groundShape = new CANNON.Plane();

  var groundBody = new CANNON.Body({
    mass: 0,
    shape: groundShape
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

  function loop() {
    var time = new Date().valueOf();

    if (lastTime !== null) {
      var dt = (time - lastTime) / 1000;
      lastTime = time;

      // Apply persistently-applied forces before each step() call
      world.bodies.forEach(function(body) {
        if(body.persistentForce) {
          body.force.copy(body.persistentForce);
        }
      });

      world.step(fixedTimeStep, dt, maxSubSteps);
      world.bodies.forEach(function (body) {
        if (body.updateScene) body.updateScene();
      });

      // This measures actual framerate; was 5-10 on Sam's rMBP, which is concerning
      // console.log(dt*1000);

    } else {
      lastTime = time;
    }
  }

  this.interval = setInterval(loop, fixedTimeStep*1000);
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
    var body = new CANNON.Body({
      mass: 5, // kg
      position: cannonVec(el.position),
      shape: new CANNON.Box(cannonVec(el.scale.clone().multiplyScalar(0.5)))
    });
    this.world.addBody(body);

    // To do: replace this with a DOM Mutation Observer
    el.setX = function(x) {
      el.position.x = body.position.x = x;
    };
    el.setY = function(y) {
      el.position.y = body.position.y = y;
    };
    el.setZ = function(z) {
      el.position.z = body.position.z = z;
    };

    el.applyImpulse = function(velocity, forcePoint) {
      body.applyImpulse(cannonVec(velocity), cannonVec(forcePoint));
    };
    el.setPersistentForce = function(force) {
      body.persistentForce = cannonVec(force);
    };
    el.clearPersistentForce = function() {
      body.persistentForce = null;
    };
    el.setVelocity = function(velocity) {
      // Process string representation of velocity
      if(typeof velocity == 'string') {
        velocity = velocity.split(' ');
        //console.log(velocity);
        velocity = { x: parseFloat(velocity[0]), y: parseFloat(velocity[1]) , z: parseFloat(velocity[2]) };
      }

      el.velocity = velocity;
      body.velocity = cannonVec(velocity);
    };

    body.updateScene = function () {
      if(body.sleepState !== CANNON.Body.SLEEPING) {
        var r = new Euler();
        r.setFromQuaternion(body.quaternion);
        // LOLHACKS
        r.distanceToSquared = Vector.prototype.distanceToSquared;
        var v = vrVec(body.position);

        if(v.distanceToSquared(el.position) > 0.01) el.position = v;
        if(r.distanceToSquared(el.rotation) > 0.01) el.rotation = r;
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
