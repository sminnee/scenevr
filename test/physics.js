/**
 * Test the physics engine
 */

var test = require('tape');
var Scene = require('../elements/scene');
var PhysicsEngine = require('../elements/physics-engine');
var Vector = require('../lib/vector');

test('Physics', function (t) {
  t.test('should pull values from scene graph', function (t) {
    Scene.load(process.cwd() + '/test/fixtures/physics.xml', function (scene) {
      // Start physics engine
      var p = new PhysicsEngine(scene);
      p.init();

      var el = scene.getElementById('train');

      // Position should be kept in sync in the physics engine bodies
      t.test('initial values should be loaded in', function (t) {
        t.equal(el.body.position.x, 1 ,'position - x');
        t.equal(el.body.position.y, 0.2, 'position - y');
        t.equal(el.body.position.z, -10, 'position - z');

        t.equal(el.body.velocity.x, 1 ,'velocity');

        var r = new Euler();
        r.setFromQuaternion(el.body.quaternion);
        t.ok(Math.abs(r.x-0.1)<0.00000001 ,'rotation - x');
        t.ok(Math.abs(r.y-0.2)<0.00000001, 'rotation - y');
        t.ok(Math.abs(r.z-0.3)<0.00000001, 'rotation - z');

        t.equal(el.body.mass, 26, 'mass');

        t.end();
      });

      // Position should be kept in sync in the physics engine bodies
      t.test('updates from one object shouldn\'t affect the other', function (t) {
        var el2 = scene.getElementById('luggage');
        el2.position = "50 60 70";
        el2.velocity = "1 2 3";
        el2.rotation = "0.3 0.2 0.1";

        t.equal(el.body.position.x, 1 ,'position - x');
        t.equal(el.body.position.y, 0.2, 'position - y');
        t.equal(el.body.position.z, -10, 'position - z');

        t.equal(el.body.velocity.x, 1 ,'velocity');

        var r = new Euler();
        r.setFromQuaternion(el.body.quaternion);
        t.ok(Math.abs(r.x-0.1)<0.00000001 ,'rotation - x');
        t.ok(Math.abs(r.y-0.2)<0.00000001, 'rotation - y');
        t.ok(Math.abs(r.z-0.3)<0.00000001, 'rotation - z');

        t.equal(el.body.mass, 26, 'mass');

        t.end();
      });


      t.test('updates should be transferred', function (t) {
        el.position = "3 4 5";
        t.equal(el.body.position.x, 3, 'position - x');
        t.equal(el.body.position.y, 4, 'position - y');
        t.equal(el.body.position.z, 5, 'position - z');

        el.velocity = new Vector(0.5, 0, 0);
        t.equal(el.body.velocity.x, 0.5, 'velocity');

        el.rotation = "0.4 0.5 0.6";
        var r = new Euler();
        r.setFromQuaternion(el.body.quaternion);
        t.ok(Math.abs(r.x-0.4)<0.00000001 ,'rotation - x');
        t.ok(Math.abs(r.y-0.5)<0.00000001, 'rotation - y');
        t.ok(Math.abs(r.z-0.6)<0.00000001, 'rotation - z');

        el.mass = 10;
        t.equal(el.body.mass, 10, 'mass');
        t.end();
      });

      t.end();
    });
  });

  t.test('should load physical meta-data from scene', function (t) {
    Scene.load(process.cwd() + '/test/fixtures/physics.xml', function (scene) {
      // Start physics engine
      var p = new PhysicsEngine(scene);
      p.init();

      t.test('initial gravity should be loaded in', function (t) {
        t.equal(p.world.gravity.x, 0.01, 'x');
        t.equal(p.world.gravity.y, -15, 'y');
        t.equal(p.world.gravity.z, 0.02, 'z');
        t.end();
      });

      t.test('gravity updates should be transferred', function (t) {
        scene.getElementsByTagName('physics')[0].gravity = "0.03 -16 0.04";
        t.equal(p.world.gravity.x, 0.03, 'x');
        t.equal(p.world.gravity.y, -16, 'y');
        t.equal(p.world.gravity.z, 0.04, 'z');
        t.end();
      });

    });
  });

});
