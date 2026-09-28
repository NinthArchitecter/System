/* ═══════════════════════════════════════════
   SYSTEM — util.js  (helpers, DOM, dates)
   ═══════════════════════════════════════════ */
window.U = (function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.style.cssText = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  const esc = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const num = (v, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : (d || 0); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, p) => { const m = Math.pow(10, p === undefined ? 1 : p); return Math.round(v * m) / m; };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const avg = a => a.length ? sum(a) / a.length : 0;
  const max = function () {
    const a = Array.prototype.slice.call(arguments);
    if (a.length === 1 && Array.isArray(a[0])) a = a[0];
    return a.length ? Math.max.apply(null, a) : 0;
  };
  const min = function () {
    const a = Array.prototype.slice.call(arguments);
    if (a.length === 1 && Array.isArray(a[0])) a = a[0];
    return a.length ? Math.min.apply(null, a) : 0;
  };

  /* ── даты ── */
  const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const MONTHS_S = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const DOW = ['вс','пн','вт','ср','чт','пт','сб'];
  const DOW_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { if (!s) return null; const p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
  function diffDays(a, b) { // b - a в днях
    const x = parseISO(a), y = parseISO(b);
    if (!x || !y) return 0;
    return Math.round((y - x) / 86400000);
  }
  function fmtDate(s) { const d = parseISO(s); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] : '—'; }
  function fmtDateShort(s) { const d = parseISO(s); return d ? d.getDate() + ' ' + MONTHS_S[d.getMonth()] : '—'; }
  function fmtDateFull(s) { const d = parseISO(s); return d ? DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '—'; }
  function monthKey(s) { return String(s).slice(0, 7); }
  function monthLabel(key) { const p = key.split('-'); return MONTHS_S[+p[1] - 1] + ' ' + p[0]; }
  function relTime(ts) {
    const d = (Date.now() - ts) / 1000;
    if (d < 60) return 'только что';
    if (d < 3600) return Math.floor(d / 60) + ' мин назад';
    if (d < 86400) return Math.floor(d / 3600) + ' ч назад';
    return Math.floor(d / 86400) + ' дн назад';
  }
  /* сколько дней назад (для бейджей) */
  function agoLabel(s) {
    const n = diffDays(s, today());
    if (n <= 0) return 'сегодня';
    if (n === 1) return 'вчера';
    if (n < 7) return n + ' дн назад';
    return fmtDateShort(s);
  }

  /* ── форматирование ── */
  function fmtKg(v, p) { return v ? round(v, p === undefined ? 1 : p).toFixed(p === undefined ? 1 : p) : '—'; }
  function fmtNum(v) { return round(v, 0).toLocaleString('ru-RU'); }
  function signed(v, p, unit) {
    if (!v && v !== 0) return '—';
    const s = v > 0 ? '+' : v < 0 ? '−' : '';
    return s + Math.abs(round(v, p === undefined ? 1 : p)).toFixed(p === undefined ? 1 : p) + (unit || '');
  }
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  function mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
  }
  function dur(min) {
    if (min < 60) return min + ' ' + plural(min, 'минута', 'минуты', 'минут');
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' ' + plural(h, 'час', 'часа', 'часов') + (m ? ' ' + m + ' мин' : '');
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ── DOM-события (делегирование) ── */
  function on(root, evt, sel, fn) {
    (root || document).addEventListener(evt, function (e) {
      const t = e.target.closest(sel);
      if (t && this.contains(t)) fn.call(t, e, t);
    });
  }

  function debounce(fn, ms) {
    let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 200); };
  }

  /* плавный скролл */
  function scrollToY(y) {
    const v = $('#view');
    if (v) v.scrollTo({ top: y, behavior: 'smooth' });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* локальный файл-скачивание */
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function pickFile(accept) {
    return new Promise(resolve => {
      const inp = el('input', { type: 'file', accept: accept || '.json', style: 'display:none' });
      inp.addEventListener('change', function () {
        const f = this.files && this.files[0];
        if (!f) { inp.remove(); return resolve(null); }
        const r = new FileReader();
        r.onload = () => { inp.remove(); resolve({ name: f.name, text: String(r.result) }); };
        r.onerror = () => { inp.remove(); resolve(null); };
        r.readAsText(f);
      });
      document.body.appendChild(inp);
      inp.click();
    });
  }

  /* плавное появление элементов при рендере */
  function revealStagger(root) {
    const items = $$('[data-rv]', root || $('#view'));
    items.forEach((n, i) => {
      n.style.animation = 'fadeUp .5s cubic-bezier(.22,.68,.32,1) both';
      n.style.animationDelay = Math.min(i * 34, 420) + 'ms';
    });
  }

  const style = document.createElement('style');
  style.textContent = '@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}}';
  document.head.appendChild(style);

  /* анимация числа */
  function countUp(node, to, opts) {
    const o = opts || {};
    const durMs = o.dur || 700, dec = o.dec === undefined ? 0 : o.dec, pre = o.prefix || '', suf = o.suffix || '';
    const from = o.from !== undefined ? o.from : (parseFloat(String(node.textContent).replace(/[^\d.-]/g, '')) || 0);
    if (o.fmt) {
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / durMs);
        const e = 1 - Math.pow(1 - k, 3);
        node.textContent = o.fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
      return;
    }
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / durMs);
      const e = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * e;
      node.textContent = pre + v.toFixed(dec).replace('.', dec ? ',' : '.') + suf;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function empty(icon, title, text) {
    return '<div class="empty"><i class="ico" data-ico="' + (icon || 'target') + '"></i>' +
      '<b>' + esc(title) + '</b><p>' + esc(text || '') + '</p></div>';
  }

  return { $, $$, el, esc, num, clamp, round, sum, avg, max, min, iso, parseISO, today, addDays, diffDays,
           pad, fmtDate, fmtDateShort, fmtDateFull, fmtDateFullShort: fmtDateShort, monthKey, monthLabel,
           relTime, agoLabel, fmtKg, fmtNum, signed, plural, mmss, dur, uid, on, debounce, scrollToY,
           download, pickFile, revealStagger, countUp, empty, MONTHS, MONTHS_S, DOW, DOW_FULL };
})();
