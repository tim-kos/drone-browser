faye = new Faye.Client "/faye", timeout: 120

faye.subscribe "/drone/navdata",  (data) ->
  ["batteryPercentage", "clockwiseDegrees", "altitudeMeters", "frontBackDegrees", 
  "leftRightDegrees", "xVelocity", "yVelocity", "zVelocity"].forEach (type) ->
    $("#" + type).html(Math.round(data.demo[type], 4))    
  #$("#cam").css("-webkit-transform": "rotate(" + data.demo.leftRightDegrees + "deg)")
  showBatteryStatus(data.demo.batteryPercentage)

window.showBatteryStatus = (batteryPercentage) ->
  $("#batterybar").width("" + batteryPercentage + "%")
  if batteryPercentage < 30
    $("#batteryProgress").removeClass("progress-success").addClass("progress-warning")
  if batteryPercentage < 15
    $("#batteryProgress").removeClass("progress-warning").addClass("progress-danger")    
  $("#batteryProgress").attr("data-original-title": "Battery status: " + batteryPercentage + "%")

faye.subscribe "/drone/image", (src) -> $("#cam").attr(src: src)

keymap =
  87 : { ev: 'move', action: 'front' }, # W
  83 : { ev: 'move', action: 'back' }, # S
  65 : { ev: 'move', action: 'left' }, # A
  68 : { ev: 'move', action: 'right' }, # D
  38 : { ev: 'move', action: 'up' }, # up
  40 : { ev: 'move', action: 'down' }, # down
  37 : { ev: 'move', action: 'counterClockwise' }, # left
  39 : { ev: 'move', action: 'clockwise' }, # right
  32 : { ev: 'drone', action: 'takeoff' }, # space
  27 : { ev: 'drone', action: 'land' },  # esc
  49 : { ev: 'animate', action: 'flipAhead', duration: 15 }, # 1
  50 : { ev: 'animate', action: 'flipLeft', duration: 15 }, # 2
  51 : { ev: 'animate', action: 'yawShake', duration: 15 }, # 3
  52 : { ev: 'animate', action: 'doublePhiThetaMixed', duration: 15 }, # 4
  53 : { ev: 'animate', action: 'wave', duration: 15 }, # 5
  69 : { ev: 'drone', action: 'disableEmergency'} # E
speed = 0
$(document).keydown (ev) ->
  return unless keymap[ev.keyCode]?
  ev.preventDefault()

  speed = if speed >= 1 then 1 else speed + 0.08 / (1 - speed)

  evData = keymap[ev.keyCode]
  faye.publish "/drone/" + evData.ev, action: evData.action, speed: speed, duration: evData.duration

$(document).keyup (ev) ->
  speed = 0
  faye.publish "/drone/drone", { action: 'stop' }

$("*[data-action]").on "mousedown", (ev) ->
  faye.publish "/drone/" + $(@).attr("data-action"), action: $(@).attr("data-param"), speed: 0.3, duration: 1000*parseInt($("#duration").val())

$("*[data-action]").on "mouseup", (ev) ->
  faye.publish "/drone/move", action: $(@).attr("data-param"), speed: 0 if $(@).attr("data-action") == "move"

$("*[rel=tooltip]").tooltip();

# experimental gamepad support
normalizeSpeed = (val) ->
  return 0 if Math.abs(val) < 0.15
  Math.abs(val / 4) # for safety reasons ;-)

$(document).on "gamepad:LEFT_ANALOGUE_VERT", (ev, data) ->
  direction = "back"
  direction = "forward" if data.value < 0
  faye.publish "/drone/move", action: direction, speed: normalizeSpeed(data.value)
$(document).on "gamepad:LEFT_ANALOGUE_HOR", (ev, data) ->
  direction = "right"
  direction = "left" if data.value < 0
  faye.publish "/drone/move", action: direction, speed: normalizeSpeed(data.value)


$(document).on "gamepad:RIGHT_ANALOGUE_VERT", (ev, data) ->
  direction = "up"
  direction = "down" if data.value < 0
  faye.publish "/drone/move", action: direction, speed: normalizeSpeed(data.value)
$(document).on "gamepad:RIGHT_ANALOGUE_HOR", (ev, data) ->
  if (Math.abs(data.value) > 0.5)
  direction = "clockwise"
  direction = "counterClockwise" if data.value < 0
  faye.publish "/drone/move", action: direction, speed: normalizeSpeed(data.value)  




gamepadSupportAvailable = !!navigator.webkitGetGamepads || !!navigator.webkitGamepads
if gamepadSupportAvailable
  gamepad = {}
  gamepad.BUTTONS = {
    FACE_1: 0, # Face (main) buttons
    FACE_2: 1,
    FACE_3: 2,
    FACE_4: 3,
    LEFT_SHOULDER: 4, # Top shoulder buttons
    RIGHT_SHOULDER: 5,
    LEFT_SHOULDER_BOTTOM: 6, # Bottom shoulder buttons
    RIGHT_SHOULDER_BOTTOM: 7,
    SELECT: 8,
    START: 9,
    LEFT_ANALOGUE_STICK: 10, # Analogue sticks (if depressible)
    RIGHT_ANALOGUE_STICK: 11,
    PAD_TOP: 12, # Directional (discrete) pad
    PAD_BOTTOM: 13,
    PAD_LEFT: 14,
    PAD_RIGHT: 15
  };

  gamepad.AXES = {
    LEFT_ANALOGUE_HOR: 0,
    LEFT_ANALOGUE_VERT: 1,
    RIGHT_ANALOGUE_HOR: 2,
    RIGHT_ANALOGUE_VERT: 3
  };  
  checkForGamePad = null
  padStatus = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 , 0, 0, 0, 0, 0]
  axesStatus = [0, 0, 0, 0]
  setupGamepad = (pad) ->
    console.log("setting up gamepad")
    padButtonEvent = (name, value) -> 
      $(document).trigger("gamepad:#{name}", [value: value])
    checkButtons = ->
      pad = navigator.webkitGetGamepads()[0]
      for name, index of gamepad.BUTTONS
        if padStatus[index] != pad.buttons[index]
          padStatus[index] = pad.buttons[index]
          padButtonEvent(name, pad.buttons[index])
      for name, index of gamepad.AXES
        if 0.1 < Math.abs(axesStatus[index] - pad.axes[index])
          axesStatus[index] = pad.axes[index]
          padButtonEvent(name, pad.axes[index])          
    setInterval(checkButtons, 50)
    console.log("hi")
  checkForGamePad = ->
    pad = navigator.webkitGetGamepads()[0]
    if pad?
      console.log("found")
      setupGamepad(pad)
    else
      setTimeout(@, 1000);
  checkForGamePad()
  
  











