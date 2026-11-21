// audio.js — all sound in Shadow Lantern is synthesised with WebAudio.
// No audio files, no network: footsteps, pebble taps, alarm stings,
// pickup chimes, win/lose jingles and a quiet ambient pad loop are all
// built from oscillators and filtered noise at run time.
// Revision: the pad loop now advances its chord even while muted, so
// unmuting mid-game lands on the right chord instead of restarting.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // A minor-key pad progression the ambient loop walks through.
  const PAD_CHORDS = [
    [110.0, 130.81, 164.81],
    [98.0, 123.47, 146.83],
    [87.31, 110.0, 130.81],
    [103.83, 130.81, 155.56],
  ];

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, filterFreq, when = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function padChord(freqs, dur) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + dur * 0.3);
      gain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    footstep(running) {
      if (!ctx || muted) return;
      noiseBurst(0.07, running ? 0.22 : 0.1, running ? 900 : 500);
    },
    pebble() {
      if (!ctx || muted) return;
      tone(1400, 0.08, 'sine', 0.25, 0, 900);
      noiseBurst(0.05, 0.12, 2400, 0.02);
    },
    pebbleLand() {
      if (!ctx || muted) return;
      tone(700, 0.06, 'triangle', 0.2, 0, 420);
      noiseBurst(0.06, 0.18, 1200);
    },
    pickup() {
      if (!ctx || muted) return;
      tone(660, 0.12, 'sine', 0.3);
      tone(990, 0.18, 'sine', 0.3, 0.09);
      tone(1320, 0.22, 'sine', 0.22, 0.18);
    },
    alarmOff() {
      if (!ctx || muted) return;
      tone(520, 0.1, 'square', 0.14);
      tone(780, 0.16, 'square', 0.14, 0.1);
    },
    suspicious() {
      if (!ctx || muted) return;
      tone(392, 0.16, 'triangle', 0.28, 0, 330);
      tone(330, 0.2, 'triangle', 0.24, 0.12, 294);
    },
    spotted() {
      if (!ctx || muted) return;
      tone(220, 0.14, 'sawtooth', 0.3, 0, 440);
      tone(440, 0.2, 'sawtooth', 0.3, 0.12, 660);
      tone(660, 0.3, 'sawtooth', 0.26, 0.26, 880);
      noiseBurst(0.25, 0.2, 3000, 0.05);
    },
    caught() {
      if (!ctx || muted) return;
      tone(330, 0.25, 'sawtooth', 0.3, 0, 165);
      tone(165, 0.5, 'sawtooth', 0.3, 0.22, 82);
    },
    levelClear() {
      if (!ctx || muted) return;
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => tone(n, 0.3, 'sine', 0.3, i * 0.12));
    },
    gameWin() {
      if (!ctx || muted) return;
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((n, i) => tone(n, 0.35, 'triangle', 0.28, i * 0.14));
    },
    click() {
      if (!ctx || muted) return;
      tone(880, 0.05, 'sine', 0.18);
    },
    startMusic() {
      if (!ensureContext() || musicTimer) return;
      const step = () => {
        if (muted) {
          musicStep = (musicStep + 1) % PAD_CHORDS.length;
          return;
        }
        padChord(PAD_CHORDS[musicStep], 3.6);
        musicStep = (musicStep + 1) % PAD_CHORDS.length;
      };
      step();
      musicTimer = window.setInterval(step, 3400);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
