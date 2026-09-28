/* ═══════════════════════════════════════════
   SYSTEM — fx.js  (частицы повышения уровня)
   ═══════════════════════════════════════════ */
window.FX = (function () {
  'use strict';
  let cv = null, ctx = null, parts = [], raf = null, on = false;

  function init() {
    if (cv) { resize(); return; }
    cv = U.$('#fx');
    if (!cv) return;
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!cv) return;
    const d = window.devicePixelRatio || 1;
    cv.width = innerWidth * d; cv.height = innerHeight * d;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function color() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ac-lt').trim() || '#4ea1ff';
    return v;
  }
  function burst(x, y, n, spread) {
    if (!ctx) return;
    const col = color();
    for (let i = 0; i < (n || 90); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 5) * (spread || 1);
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6,
        life: 1, decay: 0.008 + Math.random() * 0.014,
        r: 1 + Math.random() * 2.6, col: Math.random() > 0.25 ? col : '#ffffff'
      });
    }
    loop();
  }
  function levelUp() {
    if (!ctx) return;
    cv.classList.add('is-on');
    burst(innerWidth / 2, innerHeight * 0.42, 150, 1.5);
    burst(innerWidth * 0.2, innerHeight * 0.6, 70, 1);
    burst(innerWidth * 0.8, innerHeight * 0.6, 70, 1);
    /* вспышка */
    const f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;z-index:139;pointer-events:none;background:radial-gradient(circle at 50% 45%,rgba(120,190,255,.4),transparent 60%);animation:fxf .7s ease-out forwards';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 750);
  }
  function pop(x, y) { if (!ctx) return; cv.classList.add('is-on'); burst(x, y, 26, 0.7); }

  function loop() {
    if (raf) return;
    on = true;
    (function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(p => p.life > 0);
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.13; p.vx *= 0.985; p.vy *= 0.985;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.shadowBlur = 10; ctx.shadowColor = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.r * p.life), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (parts.length) raf = requestAnimationFrame(tick);
      else { raf = null; on = false; ctx.clearRect(0, 0, innerWidth, innerHeight); cv.classList.remove('is-on'); }
    })();
  }
  const st = document.createElement('style');
  st.textContent = '@keyframes fxf{from{opacity:1}to{opacity:0}}';
  document.head.appendChild(st);

  return { init, burst, levelUp, pop, resize };
})();
