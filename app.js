window.AudioContext = window.AudioContext || window.webkitAudioContext;

let ctx = null;

const startAudio = document.getElementById('startAudio');
const midiDevice = document.getElementById('midiSelector');
const clearMidi = document.getElementById('clearMidi');
const selector = document.getElementById('midiSelector');
const midiLog = document.getElementById('displayMidi');
const oscillators = {};


// TO DO

// [COMPLETED] Fix select list so that it removes disconnected devices
// ---- could be optimized
// Configure MIDI input device based off user selction 
// Add connected status for midi input and synth engine 
// Create a clock drift calculation function
// implement a dec / hex switch tab
//  implement a dark mode?
// midi feedback LED
//  add note value in midi return 


startAudio.addEventListener('click', () => {
  ctx = new AudioContext();
});

selector.addEventListener("change", deviceSelector);

// convert midi note to audio frequency 
function midiToFrequency(midi) {
  const a = 440;
  return (a / 32) * (2 ** ((midi - 9) / 12));
}

if(navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess().then(success, failure);
}

function success(midiAccess) {
  midiAccess.addEventListener('statechange', deviceChange);

  const inputs = midiAccess.inputs;

  inputs.forEach(input => {
    input.addEventListener('midimessage', handleInputs);
  });

}

function deviceSelector() {
   console.log(selector.value);
}

// listen for midi input
function handleInputs(event) {
  const command = event.data[0];
  const note = event.data[1];
  const velocity = event.data[2];
  const timeStamp = event.timeStamp;

  // checks if ctx is initialized, if true - midi data is sent to osc
  if(ctx != null) {
  switch (command) {
    // note on
    case 144:
      // if 9x message is received with velocity greater than 0, note is on
      if(velocity > 0) {
        noteOn(note, velocity);
      } 
      // if 9x message with a velocity of 0 is received, note is off
      else {
        noteOff(note);
      }
      break;
    // note off
    case 128:
      noteOff(note);
      break;
  }
}

  // Create HTML element with values and convert to hex

  let nHTML = `${decimalToHex(command)} ${decimalToHex(note)} ${velocity}`;

  document.getElementById('displayMidi').innerHTML += 
  `<div class="dataWrap" id="dataWrap">
    <p>${nHTML}</p>
    <p>${timeStamp.toFixed(0)}ms</p>
  </div>
  <hr>`

  // scrolls to last child element
  midiLog.scrollTop = midiLog.scrollHeight;
}

// Helper function - convert decimal to hex
function decimalToHex(dec) {
    return Math.abs(dec).toString(16).toUpperCase();
}

// Clear midi monitor
clearMidi.onclick = () => {
  const emptyMonitor = document.getElementById('displayMidi');
  do{
    emptyMonitor.removeChild(emptyMonitor.lastChild);
  }
  while (emptyMonitor.childNodes.length > 2); 
}

// when note on is received, create oscillator and set velocity
function noteOn(note, velocity) {
  const osc = ctx.createOscillator();

  const oscGain = ctx.createGain();
  oscGain.gain.value = 0.33;

  const velocityGainAmount = (1 / 127) * velocity;
  const velocityGain = ctx.createGain()
  velocityGain.gain.value = velocityGainAmount;

  osc.type = 'sine';
  osc.frequency.value = midiToFrequency(note);

  osc.connect(oscGain);
  oscGain.connect(velocityGain);
  velocityGain.connect(ctx.destination);

  osc.gain = oscGain;
  oscillators[note.toString()] = osc;

  osc.start();
}

//  note off on key release 
function noteOff(note) {
  const osc = oscillators[note.toString()];
  const oscGain = osc.gain;

  // set gain and fade out on key release
  oscGain.gain.setValueAtTime(oscGain.gain.value, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

  setTimeout(() => {
    osc.stop();
    osc.disconnect();
  }, 20);

  delete oscillators[note.toString()];
}

// listen for device change 
function deviceChange(event) {  
  // create an array that stores device names
  let deviceName = [];

  if(event.port.state === "connected" && event.port.type === "input") { 
    deviceName.push(`${event.port.name} (${event.port.manufacturer})`);
  }
  
  if (event.port.state === "disconnected") {
   deviceName = deviceName.filter(device => device !== (`${event.port.name} (${event.port.manufacturer}`));
  }
  
// loop through the array and create an element. Add the element to selection list
  for(let i = 0; i < deviceName.length; i++) {
    let option = deviceName[i];
    let element = document.createElement("option");
    element.textContent = option;
    element.value = option;
    element.className = 'device';
    midiDevice.appendChild(element);
  }

  // loop through array and remove element fromn selection list if device is disconnected

  let options = midiDevice.getElementsByClassName('device');
    for(let i=0; i<options.length; i++) {
        if(event.port.state === "disconnected") {
          midiDevice.removeChild(options[i]);
            i--; // options have now less element, then decrease i
        }
    }

    console.log(event);
}

function failure() {
  console.log('Could not connect MIDI');
}