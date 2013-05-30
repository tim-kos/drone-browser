var express = require("express");
var faye = require("faye");
var path = require("path");
var drone = require("ar-drone").createClient();
var fs = require('fs');

(function() {
  drone.config('general:navdata_demo', 'TRUE');
  var app = express();

  app.configure(function() {
    app.set('port', process.env.PORT || 3001);
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    return app.use("/components", express.static(path.join(__dirname, 'components')));
  });

  var server = require("http").createServer(app);

  new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
  }).attach(server);

  var socket = new faye.Client("http://localhost:" + (app.get("port")) + "/faye");
  socket.subscribe("/drone/move", function(cmd) {
    var _name;

    var _name = cmd.action
    return typeof drone[_name] === "function" ? drone[_name](cmd.speed) : void 0;
  });

  socket.subscribe("/drone/animate", function(cmd) {
    console.log('animate', cmd);
    return drone.animate(cmd.action, cmd.duration);
  });

  socket.subscribe("/drone/animateLeds", function(cmd) {
    cmd.duration = cmd.duration / 1000;
    console.log('animateLeds', cmd);
    return drone.animateLeds(cmd.action, cmd.hz, cmd.duration);
  });

  var saveNextFrame = false;
  socket.subscribe("/drone/takephoto", function(cmd) {
    saveNextFrame = true;
  });

  socket.subscribe("/drone/switchtofrontcamera", function(cmd) {
    drone.config('video:video_channel', 0);
  });

  socket.subscribe("/drone/switchtobottomcamera", function(cmd) {
    drone.config('video:video_channel', 3);
  });

  socket.subscribe("/drone/drone", function(cmd) {
    var _name;
    console.log('drone command: ', cmd);
    return typeof drone[_name = cmd.action] === "function" ? drone[_name]() : void 0;
  });

  server.listen(app.get("port"), function() {
    return console.log("Express server listening on port " + app.get("port"));
  });


  var currentImg = null;
  drone.on('navdata', function(data) {
    return socket.publish("/drone/navdata", data);
  });

  var imageSendingPaused = false;

  var frameCount = 0;
  drone.createPngStream().on("data", function(frame) {
    currentImg = frame;
    if (imageSendingPaused) {
      return;
    }

    if (saveNextFrame) {
      frameCount++;
      savePhoto(frame, frameCount);

      saveNextFrame = false;
    }

    socket.publish("/drone/image", "/image/" + (Math.random()));
    imageSendingPaused = true;
    return setTimeout(function() {
      imageSendingPaused = false;
    }, 100);
  });

  app.get("/image/:id", function(req, res) {
    res.writeHead(200, {
      "Content-Type": "image/png"
    });
    return res.end(currentImg, "binary");
  });
}).call(this);

function savePhoto(frame, count) {
  console.log('save Photo');
  var thePath = path.join(__dirname, 'pics');
  if (count > 10) {
    return;
  }

  fs.writeFile(thePath + '/' + count + '.png', frame, function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Photo was saved!", count + '.png');
    }
  });
}
