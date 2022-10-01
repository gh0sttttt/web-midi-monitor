window.AudioContext = window.AudioContext || window.webkitAudioContext;

let ctx;

const startAudio = document.getElementById('startAudio');
const midiDevice = document.getElementById('midiSelector');
const clearMidi = document.getElementById('clearMidi');
const selector = document.getElementById('midiSelector');
const midiLog = document.getElementById('displayMidi');
const oscillators = {};

// TO DO

// Configure MIDI input device based off user selction 
// Add connected status for midi input and synth engine 
// Create a clock drift calculation function
// implement a dec / hex switch tab
//  implement a dark mode?
// midi feedback LED


startAudio.addEventListener('click', () => {
  ctx = new AudioContext();
});

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

// listen for midi input
function handleInputs(event) {
  const command = event.data[0];
  const note = event.data[1];
  const velocity = event.data[2];
  const timeStamp = event.timeStamp;

  // checks if ctx is initialized, if true - midi data is sent to osc
  if(ctx) {
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

  let nHTML = `${decimalToHex(command)} ${decimalToHex(note)} ${decimalToHex(velocity)}`;

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
// console.log(
  // `Name: ${event.port.name}, Manufacturer: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
  
  // create an array that stores device names
  let deviceName = [];
  if(event.port.type === "input") { 
    deviceName.push(`${event.port.name} (${event.port.manufacturer})`);
  }
  
// loop through the array and create an element. Add the element to selection list
  for(let i = 0; i < deviceName.length; i++) {
    let option = deviceName[i];
    let element = document.createElement("option");
    element.textContent = option;
    element.value = option;
    midiDevice.appendChild(element);
  }
}

function failure() {
  console.log('Could not connect MIDI');
}