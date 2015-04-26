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
        t.end();
      });

      t.end();
    });
  });
});
