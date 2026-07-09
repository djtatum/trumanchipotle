// --- Ambient Dust Particles Generator ---
function createParticles() {
    const container = document.getElementById('particles-container');
    const particleCount = 25;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Randomize dimensions
        const size = Math.random() * 5 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Randomize initial positions
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;
        
        // Randomize animation delays and durations
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
        particle.style.opacity = Math.random() * 0.5 + 0.1;
        
        container.appendChild(particle);
    }
}

// --- Diary Navigation Logic ---
let currentEntry = 1;
const totalEntries = 4;

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const entryIndicator = document.getElementById('entry-indicator');

function updateEntries() {
    // Hide all entries
    for (let i = 1; i <= totalEntries; i++) {
        document.getElementById(`entry-${i}`).classList.remove('active');
    }
    // Show active entry
    document.getElementById(`entry-${currentEntry}`).classList.add('active');
    
    // Update indicator
    entryIndicator.textContent = `${currentEntry} / ${totalEntries}`;
    
    // Enable/disable buttons
    prevBtn.disabled = (currentEntry === 1);
    nextBtn.disabled = (currentEntry === totalEntries);
}

prevBtn.addEventListener('click', () => {
    if (currentEntry > 1) {
        currentEntry--;
        updateEntries();
        playPageTurnSound();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentEntry < totalEntries) {
        currentEntry++;
        updateEntries();
        playPageTurnSound();
    }
});

// --- Web Audio API Ethereal Sound Design ---
let audioCtx = null;
let mainGain = null;
let isAudioInitialized = false;

// Synth nodes
let subOsc = null;
let padOscs = [];
let vinylNoiseNode = null;
let vinylCracklesInterval = null;
let bellInterval = null;
let delayNode = null;
let lowpassFilter = null;

// LFO for filter sweep
let filterLFO = null;
let filterLFOGain = null;

const volumeSlider = document.getElementById('volume-slider');
const freqKnob = document.getElementById('freq-knob');
const freqValText = document.getElementById('freq-val');
const redRoomToggle = document.getElementById('red-room-toggle');
const vacuumTube = document.getElementById('vacuum-tube');
const filament = vacuumTube.querySelector('.filament');

// Initialize Audio Context on user gesture
function initAudio() {
    if (isAudioInitialized) return;
    
    // Create AudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Create Main Gain Node
    mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(volumeSlider.value / 100 * 0.4, audioCtx.currentTime); // Limit max volume to be polite
    mainGain.connect(audioCtx.destination);
    
    // Create Lowpass Filter
    lowpassFilter = audioCtx.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.setValueAtTime(320, audioCtx.currentTime);
    lowpassFilter.Q.setValueAtTime(1.5, audioCtx.currentTime);
    lowpassFilter.connect(mainGain);
    
    // Start ambient sounds
    startSubDrone();
    startChordPad();
    startVinylNoise();
    startEerieBells();
    
    // Turn on the vacuum tube filament glow
    filament.classList.add('active');
    
    isAudioInitialized = true;
    console.log("Audio synthesized successfully.");
}

// Low industrial hum drone
function startSubDrone() {
    subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55.0, audioCtx.currentTime); // A1 note
    
    const subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    
    subOsc.connect(subGain);
    subGain.connect(lowpassFilter);
    subOsc.start();
}

// Ethereal slow minor chord pad
const baseChordFrequencies = [
    110.00, // A2 (Root)
    130.81, // C3 (Minor 3rd)
    164.81, // E3 (5th)
    196.00  // G3 (7th)
];

function startChordPad() {
    // Generate LFO to slowly sweep filter cutoff
    filterLFO = audioCtx.createOscillator();
    filterLFO.type = 'sine';
    filterLFO.frequency.setValueAtTime(0.08, audioCtx.currentTime); // Super slow (12.5 seconds per cycle)
    
    filterLFOGain = audioCtx.createGain();
    filterLFOGain.gain.setValueAtTime(80, audioCtx.currentTime); // Sweep depth
    
    filterLFO.connect(filterLFOGain);
    filterLFOGain.connect(lowpassFilter.frequency);
    filterLFO.start();
    
    // Create oscillators for chord notes
    baseChordFrequencies.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        // Detune slightly to add lush chorus texture
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, audioCtx.currentTime);
        
        // Individual slow-pulsing gain nodes for each note
        const noteGain = audioCtx.createGain();
        noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 2.0); // Smooth fade-in
        
        // Modulate individual volumes to make the pad feel alive
        const volumeLFO = audioCtx.createOscillator();
        volumeLFO.type = 'sine';
        volumeLFO.frequency.setValueAtTime(0.03 + index * 0.01, audioCtx.currentTime); // Different speed for each note
        
        const volumeLFOGain = audioCtx.createGain();
        volumeLFOGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        
        volumeLFO.connect(volumeLFOGain);
        volumeLFOGain.connect(noteGain.gain);
        volumeLFO.start();
        
        osc.connect(noteGain);
        noteGain.connect(lowpassFilter);
        osc.start();
        
        padOscs.push({ osc, gainNode: noteGain, baseFreq: freq });
    });
}

// Generate real-time procedural vinyl static and crackle
function startVinylNoise() {
    // 1. Procedural White Noise Buffer
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    vinylNoiseNode = audioCtx.createBufferSource();
    vinylNoiseNode.buffer = noiseBuffer;
    vinylNoiseNode.loop = true;
    
    // Filter noise to sound like high-frequency dust crackle background
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3500, audioCtx.currentTime);
    noiseFilter.Q.setValueAtTime(1.0, audioCtx.currentTime);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.005, audioCtx.currentTime); // Very quiet, textured
    
    vinylNoiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(mainGain);
    vinylNoiseNode.start();
    
    // 2. Randomized Vinyl Crackles (Pops)
    vinylCracklesInterval = setInterval(() => {
        if (Math.random() < 0.35) { // 35% chance every 150ms
            triggerVinylPop();
        }
    }, 150);
}

function triggerVinylPop() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    // Quick impulse click
    const osc = audioCtx.createOscillator();
    const popGain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.random() * 800 + 100, audioCtx.currentTime);
    
    popGain.gain.setValueAtTime(0, audioCtx.currentTime);
    popGain.gain.linearRampToValueAtTime(Math.random() * 0.015 + 0.005, audioCtx.currentTime + 0.001);
    popGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + Math.random() * 0.02 + 0.01);
    
    osc.connect(popGain);
    popGain.connect(mainGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
}

// Procedural Eerie Bell Chimes (plays occasionally, with feedback delay)
function startEerieBells() {
    // Setup Delay feedback node
    delayNode = audioCtx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.6, audioCtx.currentTime); // 600ms echo
    
    const delayFeedback = audioCtx.createGain();
    delayFeedback.gain.setValueAtTime(0.4, audioCtx.currentTime); // 40% feedback
    
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(mainGain);
    
    // Trigger a bell chord every 8 seconds
    bellInterval = setInterval(() => {
        if (Math.random() < 0.6) {
            triggerBell();
        }
    }, 8000);
}

function triggerBell() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    // Twin Peaks-style Rhodes/Vibe note
    // Randomly choose from A Minor key notes: C4 (261.63Hz), E4 (329.63Hz), G4 (392Hz), B4 (493.88Hz)
    const bellFrequencies = [261.63, 329.63, 392.00, 493.88];
    const targetFreq = bellFrequencies[Math.floor(Math.random() * bellFrequencies.length)];
    
    const osc = audioCtx.createOscillator();
    const bellGain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq, audioCtx.currentTime);
    
    bellGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bellGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.5); // long ring
    
    osc.connect(bellGain);
    bellGain.connect(delayNode); // Connect to delay for spatial width
    bellGain.connect(mainGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 3.0);
}

// Play page turn synthesizer sound
function playPageTurnSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Combine noise and sine wave for paper friction sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.35);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(mainGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

// --- Interactivity Controllers ---

// 1. Volume Slider
volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value / 100 * 0.4; // Map slider to comfortable limits
    if (mainGain) {
        mainGain.gain.setValueAtTime(val, audioCtx.currentTime);
    }
    // Update vacuum filament brightness based on volume
    if (isAudioInitialized) {
        filament.style.opacity = e.target.value / 100 * 0.8 + 0.2;
    }
});

// 2. Vintage Tuning Knob Dragging
let isDraggingKnob = false;
let currentRotation = 0; // In degrees
let startAngle = 0;

freqKnob.addEventListener('mousedown', startKnobDrag);
freqKnob.addEventListener('touchstart', startKnobDrag);

function startKnobDrag(e) {
    if (!isAudioInitialized) initAudio();
    isDraggingKnob = true;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const rect = freqKnob.getBoundingClientRect();
    const knobCenterX = rect.left + rect.width / 2;
    const knobCenterY = rect.top + rect.height / 2;
    
    startAngle = Math.atan2(clientY - knobCenterY, clientX - knobCenterX) * (180 / Math.PI) - currentRotation;
    
    document.addEventListener('mousemove', dragKnob);
    document.addEventListener('touchmove', dragKnob);
    document.addEventListener('mouseup', stopKnobDrag);
    document.addEventListener('touchend', stopKnobDrag);
    
    e.preventDefault();
}

function dragKnob(e) {
    if (!isDraggingKnob) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;
    
    const rect = freqKnob.getBoundingClientRect();
    const knobCenterX = rect.left + rect.width / 2;
    const knobCenterY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(clientY - knobCenterY, clientX - knobCenterX) * (180 / Math.PI);
    currentRotation = angle - startAngle;
    
    // Clamp rotation between -150 and 150 degrees
    if (currentRotation < -150) currentRotation = -150;
    if (currentRotation > 150) currentRotation = 150;
    
    freqKnob.style.transform = `rotate(${currentRotation}deg)`;
    
    // Map rotation to frequency factor (e.g. 430Hz to 630Hz)
    const factor = (currentRotation + 150) / 300; // 0 to 1
    const tunedFreq = Math.round(432 + factor * 200); // 432Hz to 632Hz
    freqValText.textContent = `${tunedFreq} Hz`;
    
    // Apply detuning to the chord oscillators based on frequency knob
    if (isAudioInitialized) {
        padOscs.forEach((item, index) => {
            const detuneAmount = (factor - 0.5) * 50; // Detune pads up to 25 cents
            item.osc.detune.setValueAtTime(detuneAmount + (Math.random() - 0.5) * 8, audioCtx.currentTime);
        });
    }
}

function stopKnobDrag() {
    isDraggingKnob = false;
    document.removeEventListener('mousemove', dragKnob);
    document.removeEventListener('touchmove', dragKnob);
    document.removeEventListener('mouseup', stopKnobDrag);
    document.removeEventListener('touchend', stopKnobDrag);
}

// 3. Red Room Toggle Mode transition logic
redRoomToggle.addEventListener('change', (e) => {
    if (!isAudioInitialized) initAudio();
    
    const isRedRoom = e.target.checked;
    
    if (isRedRoom) {
        document.body.classList.add('red-room-mode');
        transitionToRedRoomAudio();
    } else {
        document.body.classList.remove('red-room-mode');
        transitionToStandardAudio();
    }
});

function transitionToRedRoomAudio() {
    if (!isAudioInitialized) return;
    
    const now = audioCtx.currentTime;
    
    // 1. Sub drone becomes deep, menacing, loud
    subOsc.frequency.exponentialRampToValueAtTime(44.0, now + 2.0); // Dropping pitch to D1 (44Hz)
    subOsc.type = 'sawtooth'; // Rougher waveform for industrial feel
    
    // Lower filter cutoff for absolute heavy rumbling bass
    lowpassFilter.frequency.setValueAtTime(140, now);
    if (filterLFOGain) {
        filterLFOGain.gain.setValueAtTime(30, now); // less high-frequency sweep
    }
    
    // 2. Detune the main pads drastically to create unsettling dissonance
    padOscs.forEach((item, index) => {
        // Shift root keys slightly off-key
        const detunedMultiplier = (index === 1 || index === 3) ? 1.05 : 0.95; // create minor-second intervals
        item.osc.frequency.exponentialRampToValueAtTime(item.baseFreq * detunedMultiplier, now + 3.0);
        item.osc.detune.setValueAtTime(30, now + 3.0);
        item.osc.type = 'sawtooth'; // Creepier saw wave
    });
    
    // 3. Increase delay feedback and make delay time slower
    if (delayNode) {
        delayNode.delayTime.exponentialRampToValueAtTime(0.85, now + 2.0); // slower echo
    }
}

function transitionToStandardAudio() {
    if (!isAudioInitialized) return;
    
    const now = audioCtx.currentTime;
    
    // Restore Sub-drone sine & volume
    subOsc.frequency.exponentialRampToValueAtTime(55.0, now + 1.5);
    subOsc.type = 'sine';
    
    // Restore filter frequency sweep
    lowpassFilter.frequency.setValueAtTime(320, now);
    if (filterLFOGain) {
        filterLFOGain.gain.setValueAtTime(80, now);
    }
    
    // Restore chord pad frequencies & waveforms
    padOscs.forEach((item, index) => {
        item.osc.frequency.exponentialRampToValueAtTime(item.baseFreq, now + 1.5);
        item.osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now + 1.5);
        item.osc.type = 'triangle';
    });
    
    // Restore delay feedback and timing
    if (delayNode) {
        delayNode.delayTime.exponentialRampToValueAtTime(0.6, now + 1.5);
    }
}

// 4. Book Opening Animation Trigger
const book = document.getElementById('book');
const openBtn = document.getElementById('open-btn');

openBtn.addEventListener('click', () => {
    // Open the book
    book.classList.add('open');
    // Start Audio
    initAudio();
    // Resume context if suspended (browser security)
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
});

// Sound Toggle Fallback Button
document.getElementById('sound-toggle-fallback').addEventListener('click', () => {
    initAudio();
    if (audioCtx) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
            document.getElementById('sound-toggle-fallback').textContent = "🔊 Disable Audio Ambient";
        } else {
            audioCtx.suspend();
            document.getElementById('sound-toggle-fallback').textContent = "🔇 Enable Audio Ambient";
        }
    }
});

// 5. Write to the Void Effect
const voidInput = document.getElementById('void-input');
const burnBtn = document.getElementById('burn-btn');
const voidOutput = document.getElementById('void-output');

const lynchianQuotes = [
    "The owls are not what they seem.",
    "That gum you like is going to come back in style.",
    "There is a blue rose waiting in the corner.",
    "We are like the dreamer who dreams and then lives inside the dream.",
    "Do you hear it? The radiator is speaking in reverse.",
    "The double steak is extra, but the silence is absolute.",
    "Sometimes my arms bend back.",
    "It is happening again. The salsa has gone sour.",
    "The giant is in the hallway. He has your tortilla."
];

burnBtn.addEventListener('click', () => {
    const text = voidInput.value.trim();
    if (!text) return;
    
    // Play sizzling burning sound
    playBurnSound();
    
    // Clear previous response
    voidOutput.innerHTML = '';
    
    // Setup character span elements for typing & disintegrating
    const spanContainer = document.createElement('div');
    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char; // Handle spaces
        span.classList.add('burn-char');
        span.style.animationDelay = `${index * 0.04}s`;
        spanContainer.appendChild(span);
    });
    
    voidOutput.appendChild(spanContainer);
    voidInput.value = ''; // clear input
    
    // Wait for the burning animation to complete (approx 2.5s)
    setTimeout(() => {
        voidOutput.innerHTML = ''; // clear burned text
        
        // Type out the oracle response letter by letter
        const randomQuote = lynchianQuotes[Math.floor(Math.random() * lynchianQuotes.length)];
        let quoteIndex = 0;
        
        // Whispering typing effect
        const typingInterval = setInterval(() => {
            if (quoteIndex < randomQuote.length) {
                voidOutput.innerHTML += randomQuote[quoteIndex];
                quoteIndex++;
                if (Math.random() < 0.3) playTypeTick();
            } else {
                clearInterval(typingInterval);
            }
        }, 60);
        
    }, text.length * 40 + 1300);
});

// Sizzling white noise blast for burning secret
function playBurnSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1.2);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.4);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(mainGain);
    
    source.start();
    source.stop(audioCtx.currentTime + 1.5);
}

// Soft typewriter typing click sound
function playTypeTick() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.random() * 1200 + 400, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02);
    
    osc.connect(gain);
    gain.connect(mainGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
}

// Enable clicking the blue rose to play a short eerie backward chime
const blueRoseImg = document.getElementById('blue-rose');
blueRoseImg.addEventListener('click', () => {
    if (!isAudioInitialized) initAudio();
    if (audioCtx && audioCtx.state !== 'suspended') {
        playRoseChime();
    }
});

function playRoseChime() {
    const now = audioCtx.currentTime;
    
    // Play a series of notes in reverse (e.g. rising pitch to sound backward)
    const notes = [220.00, 277.18, 329.63, 440.00, 554.37]; // A major arpeggio
    notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        
        // Reverse volume envelope (fades IN then cuts off)
        gain.gain.setValueAtTime(0, now + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.03, now + index * 0.12 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.2);
        
        osc.connect(gain);
        gain.connect(delayNode || mainGain);
        
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.25);
    });
    
    // Visual flash of blue rose border
    blueRoseImg.style.filter = 'brightness(1.5) contrast(1.5) drop-shadow(0 0 10px rgba(0, 100, 255, 0.8))';
    setTimeout(() => {
        blueRoseImg.style.filter = '';
    }, 800);
}

// Flicker desk lamp on click
const bulb = document.getElementById('bulb');
bulb.addEventListener('click', () => {
    if (audioCtx && audioCtx.state !== 'suspended') {
        // Buzz sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, audioCtx.currentTime); // 60Hz mains hum buzz
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(mainGain);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
    
    // Quick physical double-flicker
    bulb.style.animation = 'none';
    void bulb.offsetWidth; // trigger reflow
    bulb.style.animation = 'flicker 0.4s 2 alternate';
    setTimeout(() => {
        bulb.style.animation = '';
    }, 900);
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    createParticles();
    updateEntries();
});
