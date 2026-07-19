// ==== Audio setup ====
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const bufferCache = {};   // key -> AudioBuffer

async function loadSound(key) {
    if (bufferCache[key]) return bufferCache[key];
    const sound = SOUNDS[key];
    if (!sound) throw new Error("Unknown sound: " + key);
    const res = await fetch(sound.file);
    if (!res.ok) throw new Error("Could not load " + sound.file);
    const arrayBuf = await res.arrayBuffer();
    bufferCache[key] = await audioCtx.decodeAudioData(arrayBuf);
    return bufferCache[key];
}

// ==== DOM ====
const critter = document.getElementById("critter");
const titleEmoji = document.getElementById("titleEmoji");
const titleText = document.getElementById("titleText");
const soundSelect = document.getElementById("soundSelect");
const bpmSlider = document.getElementById("bpm");
const bpmDisplay = document.getElementById("bpmDisplay");
const tempoLabel = document.getElementById("tempoLabel");
const timeSigSelect = document.getElementById("timeSig");
// const volumeSlider = document.getElementById("volume");
const startBtn = document.getElementById("startBtn");
const tapBtn = document.getElementById("tapBtn");
const beatDots = document.getElementById("beatDots");

// ==== State ====
let currentSoundKey = DEFAULT_SOUND;
let isRunning = false;
let currentBeat = 0;
let nextNoteTime = 0;
let schedulerTimer = null;
let tapTimes = [];

// ==== Persistence ====
const savedBpm = localStorage.getItem("metronome-bpm");
const savedSig = localStorage.getItem("metronome-sig");
const savedVol = localStorage.getItem("metronome-vol");
const savedSound = localStorage.getItem("metronome-sound");
if (savedBpm) bpmSlider.value = savedBpm;
if (savedSig) timeSigSelect.value = savedSig;
// if (savedVol) volumeSlider.value = savedVol;
if (savedSound && SOUNDS[savedSound]) currentSoundKey = savedSound;

// ==== Sound picker + theme ====
function populateSoundPicker() {
    soundSelect.innerHTML = "";
    for (const key of Object.keys(SOUNDS)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = `${SOUNDS[key].emoji} ${SOUNDS[key].label}`;
        soundSelect.appendChild(opt);
    }
    soundSelect.value = currentSoundKey;
}

function applySound(key) {
    const sound = SOUNDS[key];
    if (!sound) return;
    currentSoundKey = key;

    // Update visuals
    critter.textContent = sound.emoji;
    titleEmoji.textContent = sound.emoji;
    titleText.textContent = sound.name;
    document.title = `${sound.name} ${sound.emoji}`;

    // Apply theme CSS variables
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(sound.theme || {})) {
        root.style.setProperty(prop, val);
    }

    localStorage.setItem("metronome-sound", key);

    // Warm up the buffer if audio context already exists
    if (audioCtx) loadSound(key).catch(err => console.error(err));
}

// ==== Helpers ====
function tempoName(bpm) {
    if (bpm < 60) return "Largo";
    if (bpm < 76) return "Adagio";
    if (bpm < 108) return "Andante";
    if (bpm < 120) return "Moderato";
    if (bpm < 168) return "Allegro";
    if (bpm < 200) return "Presto";
    return "Prestissimo";
}

function renderDots() {
    const beats = parseInt(timeSigSelect.value);
    beatDots.innerHTML = "";
    for (let i = 0; i < beats; i++) {
        const d = document.createElement("div");
        d.className = "dot" + (i === 0 ? " accent-dot" : "");
        beatDots.appendChild(d);
    }
}

function updateBpmUI() {
    const bpm = parseInt(bpmSlider.value);
    bpmDisplay.textContent = bpm;
    tempoLabel.textContent = tempoName(bpm);
    localStorage.setItem("metronome-bpm", bpm);
}

// ==== Audio: play sample ====
function scheduleHit(time, accent) {
    const buffer = bufferCache[currentSoundKey];
    if (!buffer) return;

    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    // Accent beats play slightly faster/higher pitched for emphasis
    src.playbackRate.value = accent ? 1.15 : 1.0;

    const gain = audioCtx.createGain();
    const vol = 1 * (accent ? 1.0 : 0.75);
    gain.gain.setValueAtTime(vol, time);

    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(time);
}

// ==== Precise scheduler (look-ahead pattern) ====
// setInterval alone drifts; Web Audio scheduling stays tight.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.1; // seconds

function scheduler() {
    const bpm = parseInt(bpmSlider.value);
    const secondsPerBeat = 60.0 / bpm;
    const beats = parseInt(timeSigSelect.value);

    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
        const accent = (currentBeat === 0);
        scheduleHit(nextNoteTime, accent);

        // Schedule the visual update for this beat
        const beatToShow = currentBeat;
        const delay = Math.max(0, (nextNoteTime - audioCtx.currentTime) * 1000);
        setTimeout(() => visualBeat(beatToShow, accent), delay);

        nextNoteTime += secondsPerBeat;
        currentBeat = (currentBeat + 1) % beats;
    }
}

function visualBeat(beatIdx, accent) {
    critter.classList.add("active");
    if (accent) critter.classList.add("accent");
    setTimeout(() => {
        critter.classList.remove("active");
        critter.classList.remove("accent");
    }, 120);

    const dots = beatDots.querySelectorAll(".dot");
    dots.forEach(d => d.classList.remove("active"));
    if (dots[beatIdx]) dots[beatIdx].classList.add("active");
}

async function start() {
    if (!audioCtx) audioCtx = new AudioContext();
    await audioCtx.resume();
    try {
        await loadSound(currentSoundKey);
    } catch (err) {
        alert(`Couldn't load ${SOUNDS[currentSoundKey].file}. Make sure it's in the same folder and you're serving via http:// (not file://).`);
        console.error(err);
        return;
    }
    if (isRunning) return;
    isRunning = true;
    currentBeat = 0;
    nextNoteTime = audioCtx.currentTime + 0.05;
    schedulerTimer = setInterval(scheduler, LOOKAHEAD_MS);
    startBtn.textContent = "⏸ Stop";
}

function stop() {
    isRunning = false;
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    startBtn.textContent = "▶ Start";
    beatDots.querySelectorAll(".dot").forEach(d => d.classList.remove("active"));
}

function toggle() { isRunning ? stop() : start(); }

// ==== Tap tempo ====
function tap() {
    const now = performance.now();
    tapTimes.push(now);
    // Keep only last 4 taps within 2s
    tapTimes = tapTimes.filter(t => now - t < 2000);
    if (tapTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tapTimes.length; i++) {
            intervals.push(tapTimes[i] - tapTimes[i - 1]);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.min(240, Math.max(40, Math.round(60000 / avg)));
        bpmSlider.value = bpm;
        updateBpmUI();
    }
}

// ==== Events ====
bpmSlider.addEventListener("input", updateBpmUI);
timeSigSelect.addEventListener("change", () => {
    localStorage.setItem("metronome-sig", timeSigSelect.value);
    renderDots();
    currentBeat = 0;
});
// volumeSlider.addEventListener("input", () => {
//     localStorage.setItem("metronome-vol", volumeSlider.value);
// });
soundSelect.addEventListener("change", () => applySound(soundSelect.value));

document.getElementById("bpmDown").addEventListener("click", () => {
    bpmSlider.value = Math.max(40, parseInt(bpmSlider.value) - 1);
    updateBpmUI();
});
document.getElementById("bpmUp").addEventListener("click", () => {
    bpmSlider.value = Math.min(240, parseInt(bpmSlider.value) + 1);
    updateBpmUI();
});

startBtn.addEventListener("click", toggle);
tapBtn.addEventListener("click", tap);
critter.addEventListener("click", toggle);

document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    else if (e.key.toLowerCase() === "t") { tap(); }
    else if (e.key === "ArrowRight") {
        bpmSlider.value = Math.min(240, parseInt(bpmSlider.value) + 1);
        updateBpmUI();
    } else if (e.key === "ArrowLeft") {
        bpmSlider.value = Math.max(40, parseInt(bpmSlider.value) - 1);
        updateBpmUI();
    }
});

// ==== Init ====
populateSoundPicker();
applySound(currentSoundKey);
renderDots();
updateBpmUI();
