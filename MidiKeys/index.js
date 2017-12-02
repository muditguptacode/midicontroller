var easymidi = require('easymidi');
var Hue = require('philips-hue');
var hue = new Hue();
hue.devicetype = 'my-hue-app';
hue.bridge = "192.168.1.199";
hue.username = "FzPhmbPxKWNVJbqtZg1IZsFN-InM1PBrpAXrUzHd"

var handlerFunctions = {
    "setBrightness": function (params) {
        params.lightNums.map(function (i) {
            var state = {
                on: true,
                bri: params.brightness * 2,
                hue: 65535,
                sat: 255
            };
            hue.light(i).setState(state).then();
        });
    },
    "toggleHueLightOnOff": function (params) {
        params.lightNums.map(function (i) {
            getterFunctions["getLightState"]({
                lightNums: [i], callback: function (state) {
                    if (!state.on) {
                        hue.light(state.lightId).on();
                        output.send('noteon', {
                            note: params.note,
                            velocity: 63,
                            channel: params.channel
                        });
                    }
                    else {
                        hue.light(state.lightId).off();
                        output.send('noteon', {
                            note: params.note,
                            velocity: 12,
                            channel: params.channel
                        });
                    }
                }
            });
        });
    },
    "turnRFLightOnOff": function (params) {
        params.lightNums.map(function (i) {

        });
    }
}

var getterFunctions = {
    "getLightState": function (params) {
        params.lightNums.map(function (i) {
            hue.light(i).getInfo()
                .then(function (info) {
                    info.state.lightId = i;
                    if (params.callback && typeof params.callback == 'function') params.callback(info.state);
                });
        }
        );
    },
}

//var inputs = easymidi.getInputs();
//var outputs = easymidi.getOutputs();
var input = new easymidi.Input('Launch Control 0');
var output = new easymidi.Output('Launch Control 1');

input.on('noteon', function (midiMessage) {
    parseMessage(midiMessage);
});
input.on('noteoff', function (midiMessage) {
    parseMessage(midiMessage);
});
input.on('cc', function (midiMessage) {
    parseMessage(midiMessage);
});


var functionMappings = {
    "channels": {
        0: {
            "name": "Light Control",
            "controllers": {
                21: {
                    "function": "setBrightness",
                    "parameters": { lightNums: [8], brightness: "$value" }
                },
                41: {
                    "function": "setBrightness",
                    "parameters": { lightNums: [7], brightness: "$value" }
                }
            },
            "notes": {
                9: {
                    "reactive": "noteon",
                    "function": "toggleHueLightOnOff",
                    "parameters": { lightNums: [8], channel: "$channel", note: "$note", velocity: "$velocity" }
                },
                10: {
                    "reactive": "noteon",
                    "function": "toggleHueLightOnOff",
                    "parameters": { lightNums: [7], channel: "$channel", note: "$note", velocity: "$velocity" }
                },
                11: {
                    "reactive": "noteon",
                    "function": "turnRFLightOnOff",
                    "parameters": { lightNums: [0], channel: "$channel", note: "$note", velocity: "$velocity" }
                }
            }
        }
    }
}


var parseMessage = function (midiMessage) {
    //console.log("parseMessage()"+JSON.stringify(midiMessage));
    var channel, controller, note, value, velocity, invokeFunction, channelName, reactive;

    if (midiMessage._type == 'cc') {
        channel = midiMessage.channel;
        controller = midiMessage.controller;
        value = midiMessage.value;
        channelName = functionMappings.channels[channel].name;
        if (!functionMappings.channels[channel].controllers.hasOwnProperty(controller)) {
            console.log("Un-Registered Controller");
            console.dir(midiMessage);
            return;
        }
        invokeFunctionName = functionMappings.channels[channel].controllers[controller].function;
        invokeFunction = handlerFunctions[invokeFunctionName];
        invokeFunctionParametersTemplate = functionMappings.channels[channel].controllers[controller].parameters;
        invokeFunctionParameters = JSON.parse(JSON.stringify(invokeFunctionParametersTemplate).replace("\"$value\"", value));

        invokeFunction(invokeFunctionParameters);
    }
    else if (midiMessage._type == 'noteon' || midiMessage._type == 'noteoff') {
        channel = midiMessage.channel;
        note = midiMessage.note;
        velocity = midiMessage.velocity;
        channelName = functionMappings.channels[channel].name;
        if (!functionMappings.channels[channel].notes.hasOwnProperty(note)) {
            console.log("Un-Registered Note");
            console.dir(midiMessage);
            return;
        }
        reactive = functionMappings.channels[channel].notes[note].reactive;
        if (reactive != midiMessage._type) return;
        invokeFunctionName = functionMappings.channels[channel].notes[note].function;
        invokeFunction = handlerFunctions[invokeFunctionName];
        invokeFunctionParametersTemplate = functionMappings.channels[channel].notes[note].parameters;
        invokeFunctionParameters = JSON.parse(JSON.stringify(invokeFunctionParametersTemplate).replace("\"$velocity\"", velocity));
        invokeFunctionParameters = JSON.parse(JSON.stringify(invokeFunctionParameters).replace("\"$channel\"", channel));
        invokeFunctionParameters = JSON.parse(JSON.stringify(invokeFunctionParameters).replace("\"$note\"", note));

        invokeFunction(invokeFunctionParameters);
    }
}