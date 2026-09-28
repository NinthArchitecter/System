/* ═══════════════════════════════════════════
   SYSTEM — audio.js (WebAudio, без файлов)
   ═══════════════════════════════════════════ */
window.SFX = (function () {
  'use strict';
  let ctx = null, master = null, on = true;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setOn(v) { on = !!v; }

  /* базовый тон */
  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!on || !ensure()) return;
    resume();
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  /* шумовой «свук системы» */
  function noise(dur, vol, hp) {
    if (!on || !ensure()) return;
    resume();
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1400;
    const g = ctx.createGain(); g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  const LIB = {
    click:   function () { tone(680, 0.05, 'square', 0.16, 0, 520); },
    tick:    function () { tone(1200, 0.03, 'sine', 0.1); },
    add:     function () { tone(520, 0.09, 'triangle', 0.3, 0, 900); tone(1040, 0.07, 'sine', 0.14, 0.07); },
    del:     function () { tone(420, 0.1, 'sawtooth', 0.16, 0, 180); },
    log:     function () { tone(760, 0.06, 'sine', 0.22); tone(1140, 0.09, 'sine', 0.16, 0.06); },
    quest:   function () { [660, 880, 1320].forEach((f, i) => tone(f, 0.14, 'triangle', 0.24, i * 0.075)); },
    levelup: function () {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.4, 'triangle', 0.26, i * 0.085));
      noise(0.5, 0.14, 2200);
    },
    achieve: function () { [784, 988, 1174].forEach((f, i) => tone(f, 0.5, 'sine', 0.2, i * 0.1)); },
    alarm:   function () { for (let i = 0; i < 3; i++) { tone(440, 0.11, 'square', 0.2, i * 0.19); } },
    win:     function () { [659, 784, 1046].forEach((f, i) => tone(f, 0.55, 'sine', 0.2, i * 0.12)); }
  };
  function play(name) { const f = LIB[name]; if (f) { try { f(); } catch (e) {} } }

  return { play, setOn, ensure, resume, isOn: function () { return on; } };
})();
