/* ═══════════════════════════════════════════════════════════════
   SYSTEM — chart.js
   Лёгкий SVG-рендерер: линия со сглаживанием и тултипом,
   столбцы, спарклайн, бары. Без зависимостей.
   ═══════════════════════════════════════════════════════════════ */
window.Chart = (function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function mk(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    return n;
  }
  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2f7bff';
  }
  function nice(min, max, ticks) {
    ticks = ticks || 5;
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const raw = span / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(U.round(v, 6));
    return { lo: lo, hi: hi, step: step, ticks: out };
  }
  /* сглаживание Catmull-Rom → кубические безье */
  function smooth(pts) {
    if (pts.length < 2) return '';
    let d = 'M' + U.round(pts[0][0], 2) + ' ' + U.round(pts[0][1], 2);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + U.round(c1x, 2) + ' ' + U.round(c1y, 2) + ',' + U.round(c2x, 2) + ' ' + U.round(c2y, 2) +
           ',' + U.round(p2[0], 2) + ' ' + U.round(p2[1], 2);
    }
    return d;
  }
  function hue(hex, dl) {
    if (!/^#/.test(hex)) return hex;
    const c = hex.replace('#','');
    const n = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
    const f = function (v) { return U.clamp(dl < 0 ? v * (1 + dl) : v + (255 - v) * dl, 0, 255); };
    const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  }

  /* ═══ ЛИНИЯ ═══
     o = { data:[{x,y,label,tip:[]}], height, color, area, dots, yPad,
           xTicks, yTicks, goal:{v,label}, bands:[{from,to,color}], unit }  */
  function line(host, o) {
    host = typeof host === 'string' ? U.$(host) : host;
    host.innerHTML = '';
    host.classList.add('chart-box');
    const data = o.data || [];
    if (data.length === 0) { host.innerHTML = U.empty('chart', 'Нет данных', 'Данные появятся после первой записи.'); return; }

    const W = host.clientWidth || o.width || 640;
    const H = o.height || 220;
    const pad = { t: 14, r: 14, b: 24, l: 40 };
    const iw = Math.max(20, W - pad.l - pad.r), ih = Math.max(20, H - pad.t - pad.b);
    const yPad = o.yPad === undefined ? 0.25 : o.yPad;

    let xs = data.map((d, i) => d.x !== undefined ? d.x : i);
    let ys = data.map(d => d.y);
    if (o.goal) ys = ys.concat([o.goal.v]);
    if (o.yMin !== undefined) ys = ys.concat([o.yMin]);
    if (o.yMax !== undefined) ys = ys.concat([o.yMax]);
    let mn = Math.min.apply(null, ys), mx = Math.max.apply(null, ys);
    if (mn === mx) { mn -= 1; mx += 1; }
    const sp = mx - mn;
    mn -= sp * yPad; mx += sp * yPad;
    const sc = nice(mn, mx, o.yTicks || 4);

    const X = i => pad.l + (xs.length === 1 ? iw / 2 : (xs[i] - xs[0]) / (xs[xs.length - 1] - xs[0]) * iw);
    const Y = v => pad.t + ih - (v - sc.lo) / (sc.hi - sc.lo) * ih;

    const svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, preserveAspectRatio: 'none' });
    const col = o.color || css('--ac');
    const uid = 'c' + Math.random().toString(36).slice(2, 8);

    /* defs */
    const defs = mk('defs');
    const lg = mk('linearGradient', { id: uid, x1: 0, y1: 0, x2: 0, y2: 1 });
    lg.appendChild(mk('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': .34 }));
    lg.appendChild(mk('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': 0 }));
    defs.appendChild(lg);
    svg.appendChild(defs);

    /* зоны-полосы */
    (o.bands || []).forEach(function (b) {
      const y1 = Y(Math.max(sc.lo, Math.min(sc.hi, b.to))), y2 = Y(Math.max(sc.lo, Math.min(sc.hi, b.from)));
      svg.appendChild(mk('rect', { x: pad.l, y: Math.min(y1, y2), width: iw, height: Math.abs(y2 - y1), fill: b.color || 'rgba(46,230,168,.08)' }));
    });

    /* сетка + подписи Y */
    const grid = mk('g', { class: 'ch-grid' });
    sc.ticks.forEach(function (v) {
      if (v < sc.lo - 1e-9 || v > sc.hi + 1e-9) return;
      const y = Y(v);
      grid.appendChild(mk('line', { x1: pad.l, y1: y, x2: pad.l + iw, y2: y }));
      const tx = mk('text', { x: pad.l - 7, y: y + 3, class: 'ch-axis', 'text-anchor': 'end' });
      tx.textContent = U.round(v, 1);
      grid.appendChild(tx);
    });
    svg.appendChild(grid);

    /* целевая линия */
    if (o.goal) {
      const y = Y(o.goal.v);
      svg.appendChild(mk('line', { x1: pad.l, y1: y, x2: pad.l + iw, y2: y, stroke: '#ffc542', 'stroke-width': 1.4, 'stroke-dasharray': '5 5', opacity: .85 }));
      const t = mk('text', { x: pad.l + iw, y: y - 6, class: 'ch-axis', 'text-anchor': 'end', fill: '#ffc542' });
      t.textContent = o.goal.label || ('цель ' + o.goal.v);
      svg.appendChild(t);
    }

    /* область + линия */
    const pts = data.map((d, i) => [X(i), Y(d.y)]);
    if (o.area !== false) {
      const ad = smooth(pts) + 'L' + U.round(pts[pts.length - 1][0], 2) + ' ' + (pad.t + ih) +
                'L' + U.round(pts[0][0], 2) + ' ' + (pad.t + ih) + 'Z';
      svg.appendChild(mk('path', { d: ad, fill: 'url(#' + uid + ')' }));
    }
    const path = mk('path', { d: smooth(pts), class: 'ch-line', stroke: col, filter: 'drop-shadow(0 0 6px ' + col + '88)' });
    svg.appendChild(path);

    /* точки */
    const dots = [];
    if (o.dots !== false && data.length <= 60) {
      pts.forEach(function (p, i) {
        const c = mk('circle', { cx: p[0], cy: p[1], r: 3.4, fill: '#0a1024', stroke: col, 'stroke-width': 2, class: 'ch-dot' });
        svg.appendChild(c); dots.push(c);
      });
    }

    /* подписи X */
    const xStep = Math.max(1, Math.ceil(data.length / (o.xTicks || 6)));
    for (let i = 0; i < data.length; i += xStep) {
      const t = mk('text', { x: X(i), y: pad.t + ih + 16, class: 'ch-axis', 'text-anchor': 'middle' });
      t.textContent = data[i].label;
      svg.appendChild(t);
    }

    /* слой тултипа */
    const hit = mk('rect', { x: pad.l, y: pad.t, width: iw, height: ih, fill: 'transparent', class: 'ch-hit' });
    const vline = mk('line', { y1: pad.t, y2: pad.t + ih, stroke: col, 'stroke-width': 1, opacity: 0, 'stroke-dasharray': '3 3' });
    const cdot = mk('circle', { r: 5.5, fill: col, stroke: '#fff', 'stroke-width': 1.6, opacity: 0 });
    svg.appendChild(vline); svg.appendChild(cdot); svg.appendChild(hit);
    host.appendChild(svg);

    const tip = document.createElement('div');
    tip.className = 'ch-tip';
    host.appendChild(tip);

    function show(e) {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      let bi = 0, bd = Infinity;
      pts.forEach(function (p, i) { const d = Math.abs(p[0] - px); if (d < bd) { bd = d; bi = i; } });
      const p = pts[bi], d = data[bi];
      vline.setAttribute('x1', p[0]); vline.setAttribute('x2', p[0]); vline.setAttribute('opacity', .5);
      cdot.setAttribute('cx', p[0]); cdot.setAttribute('cy', p[1]); cdot.setAttribute('opacity', 1);
      let html = '<b>' + U.esc(d.title || d.label) + '</b>';
      (d.tip || [['значение', (o.fmt ? o.fmt(d.y) : U.round(d.y, 1)) + (o.unit || '')]]).forEach(function (row) {
        html += '<div class="r"><span>' + U.esc(row[0]) + '</span><b style="color:' + (row[2] || col) + '">' + row[1] + '</b></div>';
      });
      tip.innerHTML = html;
      tip.classList.add('is-on');
      const hw = host.clientWidth;
      const lx = p[0] * (hw / W);
      tip.style.left = U.clamp(lx, 70, hw - 70) + 'px';
      tip.style.top = (p[1] * (hw ? (svg.getBoundingClientRect().height / r.height) : 1)) + 'px';
    }
    function hide() { vline.setAttribute('opacity', 0); cdot.setAttribute('opacity', 0); tip.classList.remove('is-on'); }
    hit.addEventListener('mousemove', show);
    hit.addEventListener('mouseleave', hide);
    hit.addEventListener('touchstart', function (e) { show(e.touches[0]); }, { passive: true });
    hit.addEventListener('touchmove', function (e) { show(e.touches[0]); }, { passive: true });
  }

  /* ═══ СТОЛБЦЫ ═══
     o = { data:[{x,y,label,title,color,sub}], height, goal, fmt, unit } */
  function bars(host, o) {
    host = typeof host === 'string' ? U.$(host) : host;
    host.innerHTML = '';
    host.classList.add('chart-box');
    const data = o.data || [];
    if (!data.length) { host.innerHTML = U.empty('chart', 'Нет данных', ''); return; }
    const W = host.clientWidth || o.width || 640, H = o.height || 180;
    const pad = { t: 12, r: 10, b: 24, l: 34 };
    const iw = Math.max(20, W - pad.l - pad.r), ih = Math.max(20, H - pad.t - pad.b);
    const mx = Math.max(o.goal || 0, U.max.apply(null, data.map(d => d.y)));
    const sc = nice(0, mx || 1, 4);
    const Y = v => pad.t + ih - (v - sc.lo) / (sc.hi - sc.lo) * ih;
    const bw = Math.max(2, Math.min(30, iw / data.length * 0.66));
    const svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H });

    const grid = mk('g', { class: 'ch-grid' });
    sc.ticks.forEach(function (v) {
      if (v < 0 || v > sc.hi) return;
      const y = Y(v);
      grid.appendChild(mk('line', { x1: pad.l, y1: y, x2: pad.l + iw, y2: y }));
      const t = mk('text', { x: pad.l - 6, y: y + 3, class: 'ch-axis', 'text-anchor': 'end' });
      t.textContent = U.round(v, 0); grid.appendChild(t);
    });
    svg.appendChild(grid);
    if (o.goal) {
      const y = Y(o.goal);
      svg.appendChild(mk('line', { x1: pad.l, y1: y, x2: pad.l + iw, y2: y, stroke: '#ffc542', 'stroke-width': 1.4, 'stroke-dasharray': '5 5' }));
    }
    const tip = document.createElement('div'); tip.className = 'ch-tip';

    data.forEach(function (d, i) {
      const cx = pad.l + (i + 0.5) * (iw / data.length);
      const y = Y(d.y), h = Math.max(1, pad.t + ih - y);
      const col = d.color || o.color || css('--ac');
      const g = mk('g', { class: 'ch-hit' });
      g.appendChild(mk('rect', { x: cx - bw / 2 - 2, y: pad.t, width: bw + 4, height: ih, fill: 'transparent' }));
      const r = mk('rect', { x: cx - bw / 2, y: y, width: bw, height: h, rx: Math.min(4, bw / 3), fill: col, opacity: .88 });
      g.appendChild(r);
      svg.appendChild(g);
      g.addEventListener('mouseenter', function () {
        r.setAttribute('opacity', 1);
        let html = '<b>' + U.esc(d.title || d.label) + '</b>';
        (d.tip || [['значение', (o.fmt ? o.fmt(d.y) : U.round(d.y, 1)) + (o.unit || '')]]).forEach(row => {
          html += '<div class="r"><span>' + U.esc(row[0]) + '</span><b style="color:' + (row[2] || col) + '">' + row[1] + '</b></div>';
        });
        tip.innerHTML = html; tip.classList.add('is-on');
        const rr = svg.getBoundingClientRect();
        tip.style.left = U.clamp(cx * (rr.width / W), 70, rr.width - 70) + 'px';
        tip.style.top = (y * (rr.height / H)) + 'px';
      });
      g.addEventListener('mouseleave', function () { r.setAttribute('opacity', .88); tip.classList.remove('is-on'); });
      if (data.length <= 32) {
        const t = mk('text', { x: cx, y: pad.t + ih + 16, class: 'ch-axis', 'text-anchor': 'middle' });
        t.textContent = d.label; svg.appendChild(t);
      }
    });
    host.appendChild(svg); host.appendChild(tip);
  }

  /* ═══ СПАРКЛАЙН (для плиток) ═══ */
  function spark(values, w, h, color) {
    w = w || 120; h = h || 34; color = color || css('--ac');
    if (!values || values.length < 2) return '';
    const mn = Math.min.apply(null, values), mx = Math.max.apply(null, values);
    const sp = (mx - mn) || 1;
    const pts = values.map((v, i) => [i / (values.length - 1) * w, h - 3 - (v - mn) / sp * (h - 6)]);
    const uid = 's' + Math.random().toString(36).slice(2, 8);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" style="overflow:visible">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity=".45"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + smooth(pts) + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" fill="url(#' + uid + ')"/>' +
      '<path d="' + smooth(pts) + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  /* ═══ КОЛЬЦЕВАЯ ДИАГРАММА (макросы) ═══ */
  function donut(segs, size, thick) {
    size = size || 168; thick = thick || 22;
    const r = size / 2 - thick / 2, C = 2 * Math.PI * r;
    const total = U.sum(segs.map(s => s.v)) || 1;
    let acc = 0, out = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)">';
    segs.forEach(function (s) {
      const len = s.v / total * C;
      out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + s.color +
        '" stroke-width="' + thick + '" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-acc) + '"/>';
      acc += len;
    });
    out += '</svg>';
    return out;
  }

  return { line, bars, spark, donut, nice, smooth };
})();
