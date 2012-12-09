window.showBatteryStatus = function(batteryPercentage) {
  $("#batterybar").width("" + batteryPercentage + "%");
  if (batteryPercentage < 30) {
    $("#batteryProgress").removeClass("progress-success").addClass("progress-warning");
  }
  if (batteryPercentage < 15) {
    $("#batteryProgress").removeClass("progress-warning").addClass("progress-danger");
  }
  return $("#batteryProgress").attr({
    "data-original-title": "Battery status: " + batteryPercentage + "%"
  });
};

(function() {
  var faye = new Faye.Client("/faye", {timeout: 120});
  var keymap = {
    87: {ev: 'move', action: 'front'},
    83: {ev: 'move', action: 'back'},
    65: {ev: 'move', action: 'left'},
    68: {ev: 'move', action: 'right'},
    38: {ev: 'move', action: 'up'},
    40: {ev: 'move', action: 'down'},
    37: {ev: 'move', action: 'counterClockwise'},
    39: {ev: 'move', action: 'clockwise'},
    32: {ev: 'drone', action: 'takeoff'},
    27: {ev: 'drone', action: 'land'},
    70: {ev: 'animate', action: 'flipAhead', duration: 15},
    71: {ev: 'animate', action: 'flipLeft', duration: 15},
    51: {ev: 'animate', action: 'yawShake', duration: 15},
    52: {ev: 'animate', action: 'doublePhiThetaMixed', duration: 15},
    53: {ev: 'animate', action: 'wave', duration: 15},
    69: {ev: 'drone', action: 'disableEmergency'}
  };

  faye.subscribe("/drone/navdata", function(data) {
    var types = [
      "batteryPercentage", "clockwiseDegrees", "altitudeMeters",
      "frontBackDegrees", "leftRightDegrees", "xVelocity", "yVelocity",
      "zVelocity"
    ];
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
    return faye.publish("/drone/" + action, {
      action: $(this).attr("data-param"),
      speed: 0.3,
      duration: 1000 * parseInt($("#duration").val(), 10)
    });
  });

  $("*[data-action]").on("mouseup", function(ev) {
    return faye.publish("/drone/move", {
      action: $(this).attr("data-param"),
      speed: $(this).attr("data-action") === "move" ? 0 : void 0
    });
  });

  $("*[rel=tooltip]").tooltip();
}).call(this);
