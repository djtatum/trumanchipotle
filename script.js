// --- Canvas Ambient Ghostly Mist & Flashlight ---
const canvas = document.getElementById('ambient-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let mouse = { x: -1000, y: -1000, active: false };

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Mouse tracking for flashlight effect
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
});

window.addEventListener('mouseleave', () => {
    mouse.active = false;
});

class MistParticle {
    constructor() {
        this.reset(true);
    }
    
    reset(initial = false) {
        this.radius = Math.random() * 180 + 120;
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + this.radius;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = -Math.random() * 0.12 - 0.04; // slow upward drift
        this.alpha = Math.random() * 0.03 + 0.008; // very faint for atmospheric overlap
        this.baseColor = Math.random() > 0.5 ? {r: 143, g: 162, b: 166} : {r: 95, g: 104, b: 112}; // cool mist colors
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = (Math.random() - 0.5) * 0.004;
    }
    
    update() {
        this.x += this.vx + Math.sin(this.angle) * 0.08;
        this.y += this.vy;
        this.angle += this.angleSpeed;
        
        // Recycle particle if it moves off-screen
        if (this.y < -this.radius || this.x < -this.radius || this.x > width + this.radius) {
            this.reset();
        }
    }
    
    draw() {
        let grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `rgba(${this.baseColor.r}, ${this.baseColor.g}, ${this.baseColor.b}, ${this.alpha})`);
        grad.addColorStop(1, 'rgba(5, 5, 5, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Generate mist particles
const particleCount = 12;
for (let i = 0; i < particleCount; i++) {
    particles.push(new MistParticle());
}

function animate() {
    // Clear with dark base color matching body CSS
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    // Draw mist particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Draw cursor flashlight effect
    if (mouse.active) {
        let flashlightGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
        flashlightGrad.addColorStop(0, 'rgba(143, 162, 166, 0.035)');
        flashlightGrad.addColorStop(0.5, 'rgba(143, 162, 166, 0.01)');
        flashlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = flashlightGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
        ctx.fill();
    }
    
    requestAnimationFrame(animate);
}
animate();


// --- procedural Ethereal Sound Design (Web Audio API) ---
let audioCtx = null;
let masterGain = null;
let droneOsc = null;
let padOscs = [];
let filterLfo = null;
let filterNode = null;
let isPlaying = false;
let crackleInterval = null;

const soundToggle = document.getElementById('sound-toggle');
const soundText = soundToggle.querySelector('.sound-text');
const statusText = document.getElementById('status-text');

function initAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Master Gain
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
    
    // Lowpass filter for the pad & drone
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(160, audioCtx.currentTime);
    filterNode.Q.setValueAtTime(1.8, audioCtx.currentTime);
    filterNode.connect(masterGain);
    
    // 1. A1 Sub hum drone (55Hz)
    droneOsc = audioCtx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.setValueAtTime(55.0, audioCtx.currentTime);
    
    let droneGain = audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    
    droneOsc.connect(droneGain);
    droneGain.connect(filterNode);
    droneOsc.start();
    
    // 2. Choral Minor Pad (A2 = 110Hz, C3 = 130.81Hz, E3 = 164.81Hz, G3 = 196.00Hz)
    const chordFrequencies = [110.00, 130.81, 164.81, 196.00];
    chordFrequencies.forEach((freq, idx) => {
        let osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        // detune oscillators slightly to build a thick, shimmering width
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, audioCtx.currentTime);
        
        let oscGain = audioCtx.createGain();
        oscGain.gain.setValueAtTime(0.045, audioCtx.currentTime);
        
        // Modulate volume slightly over time per note
        let volLfo = audioCtx.createOscillator();
        volLfo.type = 'sine';
        volLfo.frequency.setValueAtTime(0.02 + idx * 0.008, audioCtx.currentTime);
        
        let volLfoGain = audioCtx.createGain();
        volLfoGain.gain.setValueAtTime(0.018, audioCtx.currentTime);
        
        volLfo.connect(volLfoGain);
        volLfoGain.connect(oscGain.gain);
        volLfo.start();
        
        osc.connect(oscGain);
        oscGain.connect(filterNode);
        osc.start();
        
        padOscs.push({ osc, volLfo });
    });
    
    // 3. Filter LFO Sweep (Sweeps filter cut-off for breathing/movement)
    filterLfo = audioCtx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.setValueAtTime(0.06, audioCtx.currentTime); // Slow cycle
    
    let lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(75, audioCtx.currentTime); // Sweep radius
    
    filterLfo.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);
    filterLfo.start();
    
    // 4. Procedural Static Pops/Crackles (Vinyl feel)
    startStaticPops();
}

function startStaticPops() {
    crackleInterval = setInterval(() => {
        if (!audioCtx || audioCtx.state === 'suspended' || !isPlaying) return;
        
        // 22% chance every 180ms to play a crackle
        if (Math.random() < 0.22) {
            triggerPop();
        }
    }, 180);
}

function triggerPop() {
    let popOsc = audioCtx.createOscillator();
    let popGain = audioCtx.createGain();
    
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(Math.random() * 1100 + 150, audioCtx.currentTime);
    
    popGain.gain.setValueAtTime(0, audioCtx.currentTime);
    popGain.gain.linearRampToValueAtTime(Math.random() * 0.007 + 0.0015, audioCtx.currentTime + 0.001);
    popGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + Math.random() * 0.025 + 0.008);
    
    popOsc.connect(popGain);
    popGain.connect(masterGain);
    
    popOsc.start();
    popOsc.stop(audioCtx.currentTime + 0.04);
}

soundToggle.addEventListener('click', async () => {
    if (!audioCtx) {
        initAudio();
    }
    
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    
    if (!isPlaying) {
        // Fade in volume over 3 seconds
        masterGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 3.0);
        isPlaying = true;
        soundToggle.classList.add('active');
        soundText.textContent = "Silence the void";
        statusText.textContent = "[ SYSTEM STATUS: TUNED IN ]";
    } else {
        // Fade out volume over 3 seconds
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.0);
        isPlaying = false;
        soundToggle.classList.remove('active');
        soundText.textContent = "Listen to the void";
        statusText.textContent = "[ SYSTEM STATUS: QUIET ]";
        
        // Suspend context after fade-out finishes
        setTimeout(async () => {
            if (!isPlaying && audioCtx) {
                await audioCtx.suspend();
            }
        }, 3000);
    }
});

