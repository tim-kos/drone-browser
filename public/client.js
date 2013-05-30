var connected = false;

function showBatteryStatus(batteryPercentage) {
  var $progress = $("#batteryProgress");
  var $bar = $("#batterybar");
  var percent = batteryPercentage + "%";

  $bar.css({width: percent});

  var warningClass = "progress-warning";
  var dangerClass = "progress-danger";
  var successClass = "progress-success";
  if (batteryPercentage < 30) {
    $progress.removeClass(successClass).addClass(warningClass);
  }
  if (batteryPercentage < 15) {
    $progress.removeClass(warningClass).addClass(dangerClass);
  }

  $progress.find('span').text(percent);
  $('.js-battery-status').text(percent);
};

$(function() {
  var faye = new Faye.Client("/faye", {timeout: 120});
  var keymap = {
    87: {ev: 'move', action: 'front'}, // w
    83: {ev: 'move', action: 'back'}, // s
    65: {ev: 'move', action: 'left'}, // a
    68: {ev: 'move', action: 'right'}, // d
    38: {ev: 'move', action: 'up'}, // cursor up
    40: {ev: 'move', action: 'down'}, // cursor down
    37: {ev: 'move', action: 'counterClockwise'}, // cursor left
    39: {ev: 'move', action: 'clockwise'}, // cursor right
    84: {ev: 'drone', action: 'takeoff'}, // t
    76: {ev: 'drone', action: 'land'},  // l
    70: {ev: 'animate', action: 'flipAhead', duration: 15}, // f
    71: {ev: 'animate', action: 'flipLeft', duration: 15}, // g
    67: {ev: 'animate', action: 'yawShake', duration: 2000}, // c
    80: {ev: 'animate', action: 'doublePhiThetaMixed', duration: 2000}, // p
    // 87: {ev: 'animate', action: 'wave', duration: 2000}, // w
    69: {ev: 'drone', action: 'disableEmergency'} // e
  };

  setTimeout(function() {
    checkConnectStatus();
  }, 500);

  setInterval(function() {
    checkConnectStatus();
  }, 2000);

  setInterval(function() {
    connected = false;
  }, 100);

  var i = 0;
  faye.subscribe("/drone/navdata", function(data) {
    connected = true;
    var types = [
      "batteryPercentage", "clockwiseDegrees", "frontBackDegrees",
      "leftRightDegrees", "xVelocity", "yVelocity", "zVelocity"
    ];

    $("#altitudeMeters").html(Math.round(data.demo['altitudeMeters'] * 100, 1));

    types.forEach(function(type) {
      return $("#" + type).html(Math.round(data.demo[type], 4));
    });

    return showBatteryStatus(data.demo.batteryPercentage);
  });

  faye.subscribe("/drone/image", function(src) {
    return $("#cam").attr({src: src});
  });

  setInterval(function() {
    for (var code in keymap) {
      var key = keymap[code];
      if (!key || !key.down) {
        continue;
      }

      faye.publish("/drone/" + key.ev, {
        action: key.action,
        speed: 1,
        duration: key.duration
      });
    }
  }, 100);

  $(document).keydown(function(e) {
    if (!keymap[e.keyCode]) {
      return;
    }

    keymap[e.keyCode].down = true;
    e.preventDefault();
  });

  $(document).keyup(function(e) {
    if (!keymap[e.keyCode]) {
      return;
    }

    keymap[e.keyCode].down = false;
    return faye.publish("/drone/drone", {action: 'stop'});
  });


  $("*[data-action]").on("mousedown", function(e) {
    var action = $(this).attr("data-action");
    var $duration = $("#duration");
    if (action === 'animateLeds') {
      $duration = $('#animate-duration');
    }

    var opts = {
      action: $(this).attr("data-param"),
      speed: 0.3,
      duration: 1000 * parseInt($duration.val(), 10)
    };
    if (action === 'animateLeds') {
      var $hz = $("#animate-hz");
      opts.hz = parseInt($hz.val(), 10);
    }

    return faye.publish("/drone/" + action, opts);
  });

  $("*[data-action]").on("mouseup", function(ev) {
    return faye.publish("/drone/move", {
      action: $(this).attr("data-param"),
      speed: $(this).attr("data-action") === "move" ? 0 : void 0
    });
  });

  $(".js-take-photo").on("click", function(ev) {
    ev.preventDefault();
    faye.publish("/drone/takephoto", {});
  });

  $(".js-switch-to-front-camera").on("click", function(ev) {
    ev.preventDefault();
    faye.publish("/drone/switchtofrontcamera", {});
  });
  $(".js-switch-to-bottom-camera").on("click", function(ev) {
    ev.preventDefault();
    faye.publish("/drone/switchtobottomcamera", {});
  });

  $("*[rel=tooltip]").tooltip();
});

function checkConnectStatus() {
  var $connectStatus = $('.connection-status');
  var $stats = $('#stats');

  var txt = connected ? 'Connected' : 'Disconnected';
  $connectStatus.find('span').text(txt);

  if (connected) {
    $connectStatus.addClass('connected');
  } else {
    $connectStatus.removeClass('connected');
  }

  if (!connected) {
    $stats.hide();
  } else {
    $stats.show();
  }
}
