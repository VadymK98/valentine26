(() => {
  // ── Note definitions: 2 octaves C4–C6 ──
  const NOTES = [
    // Octave 4
    { name: 'C4',  freq: 261.63, black: false },
    { name: 'C#4', freq: 277.18, black: true },
    { name: 'D4',  freq: 293.66, black: false },
    { name: 'D#4', freq: 311.13, black: true },
    { name: 'E4',  freq: 329.63, black: false },
    { name: 'F4',  freq: 349.23, black: false },
    { name: 'F#4', freq: 369.99, black: true },
    { name: 'G4',  freq: 392.00, black: false },
    { name: 'G#4', freq: 415.30, black: true },
    { name: 'A4',  freq: 440.00, black: false },
    { name: 'A#4', freq: 466.16, black: true },
    { name: 'B4',  freq: 493.88, black: false },
    // Octave 5
    { name: 'C5',  freq: 523.25, black: false },
    { name: 'C#5', freq: 554.37, black: true },
    { name: 'D5',  freq: 587.33, black: false },
    { name: 'D#5', freq: 622.25, black: true },
    { name: 'E5',  freq: 659.25, black: false },
    { name: 'F5',  freq: 698.46, black: false },
    { name: 'F#5', freq: 739.99, black: true },
    { name: 'G5',  freq: 783.99, black: false },
    { name: 'G#5', freq: 830.61, black: true },
    { name: 'A5',  freq: 880.00, black: false },
    { name: 'A#5', freq: 932.33, black: true },
    { name: 'B5',  freq: 987.77, black: false },
    // C6
    { name: 'C6',  freq: 1046.50, black: false },
  ];

  const SECRET = ['C4', 'D4', 'E4', 'F4'];
  const history = [];
  let revealed = false;
  let audioCtx = null;

  // ── Build piano keys ──
  const pianoEl = document.getElementById('piano');
  const whiteNotes = NOTES.filter(n => !n.black);
  const whiteWidth = 100 / whiteNotes.length; // percent

  // Pre-compute white key index for positioning black keys
  let whiteIndex = 0;
  NOTES.forEach(note => {
    if (note.black) {
      // Black key: position relative to the previous white key
      const el = document.createElement('div');
      el.className = 'key black';
      el.dataset.note = note.name;
      el.dataset.freq = note.freq;
      const leftPercent = (whiteIndex * whiteWidth) - (whiteWidth * 0.18);
      el.style.left = leftPercent + '%';
      el.style.width = (whiteWidth * 0.58) + '%';
      el.innerHTML = `<span class="label">${note.name}</span>`;
      pianoEl.appendChild(el);
    } else {
      const el = document.createElement('div');
      el.className = 'key';
      el.dataset.note = note.name;
      el.dataset.freq = note.freq;
      el.innerHTML = `<span class="label">${note.name}</span>`;
      pianoEl.appendChild(el);
      whiteIndex++;
    }
  });

  // ── Audio Context (lazy init) ──
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ── Synthesize a piano-like tone ──
  function playTone(freq) {
    ensureAudio();
    const now = audioCtx.currentTime;

    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);

    // ADSR envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.01);   // attack
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.3); // decay
    gain.gain.setValueAtTime(0.12, now + 0.3);              // sustain
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5); // release

    // Fundamental — sine
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 1.5);

    // 2nd harmonic — triangle for warmth
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;
    const g2 = audioCtx.createGain();
    g2.gain.value = 0.12;
    osc2.connect(g2);
    g2.connect(gain);
    osc2.start(now);
    osc2.stop(now + 1.5);

    // 3rd harmonic — subtle brightness
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;
    const g3 = audioCtx.createGain();
    g3.gain.value = 0.05;
    osc3.connect(g3);
    g3.connect(gain);
    osc3.start(now);
    osc3.stop(now + 1.5);
  }

  // ── Sequence detection ──
  function checkSequence(noteName) {
    if (revealed) return;
    history.push(noteName);
    if (history.length > SECRET.length) {
      history.shift();
    }
    if (history.length === SECRET.length &&
        history.every((n, i) => n === SECRET[i])) {
      triggerReveal();
    }
  }

  // ── Reveal transition ──
  function triggerReveal() {
    revealed = true;
    const piano = document.getElementById('piano');
    const reveal = document.getElementById('reveal');

    piano.style.opacity = '0';

    piano.addEventListener('transitionend', function handler() {
      piano.removeEventListener('transitionend', handler);
      piano.style.display = 'none';
      reveal.style.display = 'flex';
      // Force reflow so the transition fires
      void reveal.offsetWidth;
      reveal.classList.add('visible');
    });
  }

  // ── Event handling ──
  const activeKeys = new Map(); // pointerId → element

  function onKeyDown(el) {
    el.classList.add('active');
    const freq = parseFloat(el.dataset.freq);
    const name = el.dataset.note;
    playTone(freq);
    checkSequence(name);
  }

  function onKeyUp(el) {
    el.classList.remove('active');
  }

  // Touch events
  pianoEl.addEventListener('touchstart', e => {
    e.preventDefault();
    ensureAudio();
    for (const touch of e.changedTouches) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && el.classList.contains('key')) {
        activeKeys.set(touch.identifier, el);
        onKeyDown(el);
      }
    }
  }, { passive: false });

  pianoEl.addEventListener('touchend', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const el = activeKeys.get(touch.identifier);
      if (el) {
        onKeyUp(el);
        activeKeys.delete(touch.identifier);
      }
    }
  }, { passive: false });

  pianoEl.addEventListener('touchcancel', e => {
    for (const touch of e.changedTouches) {
      const el = activeKeys.get(touch.identifier);
      if (el) {
        onKeyUp(el);
        activeKeys.delete(touch.identifier);
      }
    }
  });

  // Mouse events (desktop)
  pianoEl.addEventListener('mousedown', e => {
    ensureAudio();
    const el = e.target.closest('.key');
    if (el) {
      onKeyDown(el);
      const up = () => {
        onKeyUp(el);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mouseup', up);
    }
  });
})();
