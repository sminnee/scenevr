#!/usr/bin/env node

var _ = require('underscore');
var Reflector = require('./lib/reflector');
var WebsocketServer = require('./lib/websocket_server');
var Scene = require('./elements/scene');
var IndexScene = require('./lib/index_scene');
var path = require('path');
var fs = require('fs');
var glob = require('glob');
var express = require('express');
var http = require('http');
var cors = require('cors');
var exposefs = require('exposefs');
var Env = require('./lib/env');

function Server (folder, port) {
  this.folder = path.join(process.cwd(), folder);
  this.port = port;
}

Server.prototype.start = function () {
  var self = this;

  console.log('[server] Serving scenes in \'' + this.folder + '\' on port ' + this.port + '...');

  this.webServer = express();
  this.webServer.use(cors());
  this.webServer.use(express.static(this.folder));
  this.webServer.use('/fs', exposefs({basepath: this.folder}));

  var httpServer = http.createServer(this.webServer);
  httpServer.listen(this.port);

  this.websocketServer = new WebsocketServer(httpServer);
  this.websocketServer.listen();

  if (Env.supportsAutoReload()) {
    this.restart = _.throttle(this.restartServer.bind(this), 1000, {trailing: false});
  }

  this.loadAllScenes();

  if (Env.isDevelopment()) {
    require('dns').lookup(require('os').hostname(), function (err, addr, fam) {
      var url = err ? 'localhost:' + self.port : addr + ':' + self.port;
      console.log('\nOpen the following url to view your scenes:\n\thttp://client.scenevr.com/?connect=' + url + '/index.xml\n');
    });
  }
};

Server.prototype.loadAllScenes = function () {
  var self = this;

  glob(this.folder + '/*.xml', {}, function (err, files) {
    if (err || (files.length === 0)) {
      console.log('[server] Error. No scene files found in ' + self.folder);
      if (Env.isDevelopment()) {
        process.exit(-1);
      }
    }

    var indexXml = new IndexScene(files).toXml();

    Scene.load(indexXml, function (scene) {
      self.onLoaded(scene, '/index.xml');
    });

    files.forEach(function (filename) {
      Scene.load(filename, function (scene) {
        self.onLoaded(scene, '/' + path.basename(filename));

        if (Env.supportsAutoReload()) {
          fs.watch(filename, self.restart);
        }
      });
    });
  });
};

Server.prototype.onLoaded = function (scene, filename) {
  console.log('[server]  * Loaded \'' + filename + '\'');

  var reflector = new Reflector(scene, filename);
  this.websocketServer.reflectors[filename] = reflector;
  reflector.start();
};

Server.prototype.restartServer = function () {
  var self = this;

  console.log('[server] Restarting server on file change.');

  var _ref = this.websocketServer.reflectors;
  var filename;

  for (filename in _ref) {
    var reflector = _ref[filename];
    reflector.emit('<event name="restart" />');
    reflector.stop();
    reflector.scene.stop();
    delete reflector.scene;
  }

  setTimeout(function () {
    self.websocketServer.clearReflectors();
    self.loadAllScenes();
  }, 250);
};

var scenePath = process.argv[2];

if (!scenePath) {
  console.log('Usage: scenevr [scenedirectory]');
  process.exit(-1);
}

var server = new Server(scenePath, Env.getPort());
server.start();
