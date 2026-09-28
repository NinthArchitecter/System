/* ═══════════════════════════════════════════════════════════════
   SYSTEM — ui.js  (системные алерты, модалки, кольца, дайджесты)
   ═══════════════════════════════════════════════════════════════ */
window.UI = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$, el = U.el;

  /* ── 1. СИСТЕМНЫЕ АЛЕРТЫ (тосты) ── */
  const TAGS = {
    info: 'СИСТЕМА', good: 'ПОДТВЕРЖДЕНО', bad: 'ВНИМАНИЕ',
    gold: 'ДОСТИЖЕНИЕ', level: 'ПОВЫШЕНИЕ', xp: 'ОПЫТ', quest: 'ЗАДАНИЕ'
  };
  function alert(o) {
    const host = $('#toasts');
    if (!host) return;
    const kind = o.kind || 'info';
    const t = el('div', { class: 'toast toast--' + kind });
    t.innerHTML =
      '<div class="toast__tag">' + U.esc(o.tag || TAGS[kind] || TAGS.info) + '</div>' +
      '<b>' + U.esc(o.title || '') + '</b>' +
      (o.text ? '<p>' + o.text + '</p>' : '') +
      (o.xp ? '<span class="toast__xp">+' + o.xp + ' XP</span>' : '') +
      (o.action ? '<button class="btn btn--xs mt1">' + U.esc(o.action) + '</button>' : '');
    if (o.action && o.onAction) {
      $('button', t).addEventListener('click', function () { o.onAction(); kill(); });
    }
    host.appendChild(t);
    const life = o.life || 4600;
    const timer = setTimeout(kill, life);
    t.addEventListener('click', function () { clearTimeout(timer); kill(); });
    let killed = false;
    function kill() {
      if (killed) return; killed = true;
      t.classList.add('is-out');
      setTimeout(() => t.remove(), 360);
    }
    return t;
  }
  function xpAlert(amount, reason) {
    if (!amount) return;
    SFX.play('add');
    alert({ kind: 'xp', tag: 'ОПЫТ ПОЛУЧЕН', title: reason || 'Действие выполнено', xp: amount });
  }
  function levelUpAlert(lvls) {
    lvls.forEach(function (l, i) {
      setTimeout(function () {
        SFX.play('levelup');
        const r = l.rank;
        UI.alert({
          kind: 'level', tag: 'УРОВЕНЬ ' + l.level, life: 6500,
          title: r.name + ' — ' + (r.key === 'MON' ? 'Монарх теней!' : r.key === 'SH' ? 'Теневая власть' : 'Ранг ' + r.key + ' активирован'),
          text: 'Система зафиксировала рост силы. Продолжай путь.'
        });
        FX.levelUp();
      }, i * 900);
    });
  }
  function achAlert(list) {
    list.forEach(function (a, i) {
      setTimeout(function () {
        SFX.play('achieve');
        UI.alert({ kind: 'gold', tag: 'ДОСТИЖЕНИЕ ОТКРЫТО', life: 6000, title: a.name, text: U.esc(a.desc) });
        FX.levelUp();
      }, i * 1100);
    });
  }
  function ok(title, text) { SFX.play('log'); alert({ kind: 'good', title: title, text: text }); }
  function warn(title, text) { SFX.play('alarm'); alert({ kind: 'bad', title: title, text: text }); }
  function info(title, text) { alert({ kind: 'info', title: title, text: text }); }

  /* ── 2. МОДАЛКА ── */
  let modalEsc = null;
  function modal(o) {
    const m = $('#modal'), body = $('#modalBody'), title = $('#modalTitle');
    title.textContent = o.title || 'СИСТЕМА';
    body.innerHTML = o.html || '';
    m.hidden = false;
    SFX.play('tick');
    $$('[data-close]', m).forEach(b => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', onKey);
    if (o.onMount) o.onMount(body);
    const f = $('.inp, .sel, .ta', body);
    if (f && o.focus !== false) setTimeout(() => f.focus(), 60);
    function onKey(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }
    }
    modalEsc = onKey;
    return body;
  }
  function closeModal() {
    const m = $('#modal');
    if (!m || m.hidden) return;
    m.hidden = true;
    $('#modalBody').innerHTML = '';
    if (modalEsc) document.removeEventListener('keydown', modalEsc);
    modalEsc = null;
  }
  function confirm(o) {
    return new Promise(function (res) {
      modal({
        title: o.title || 'ПОДТВЕРЖДЕНИЕ',
        html: '<p class="t-dim" style="margin:0 0 4px">' + (o.text || '') + '</p>' +
              '<div class="modal__foot">' +
              '<button class="btn btn--ghost btn--sm" data-no>Отмена</button>' +
              '<button class="btn ' + (o.danger ? 'btn--danger' : '') + ' btn--sm" data-yes>' + U.esc(o.ok || 'Подтвердить') + '</button></div>',
        focus: false,
        onMount: function (b) {
          $('[data-no]', b).addEventListener('click', function () { closeModal(); res(false); });
          $('[data-yes]', b).addEventListener('click', function () { closeModal(); res(true); });
        }
      });
    });
  }

  /* ── 3. КОЛЬЦА ПРОГРЕССА (SVG) ── */
  /* arcs: [{v, max, color, label}] — концентрические */
  function rings(size, arcs, opts) {
    const o = opts || {};
    const stroke = o.stroke || 12, gap = o.gap || 7;
    const r0 = size / 2 - stroke / 2 - 2;
    const uid = gId();
    let out = '<div class="rings" style="width:' + size + 'px;height:' + size + 'px">';
    out += '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
    out += '<defs>';
    arcs.forEach(function (a, i) {
      out += '<linearGradient id="rg' + uid + '_' + i + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + a.color + '"/>' +
        '<stop offset="1" stop-color="' + lighten(a.color) + '"/></linearGradient>';
    });
    out += '</defs>';
    arcs.forEach(function (a, i) {
      const r = r0 - i * (stroke + gap);
      if (r <= 2) return;
      const C = 2 * Math.PI * r;
      const p = U.clamp(a.v / (a.max || 1), 0, 1);
      out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
        'stroke="rgba(255,255,255,.07)" stroke-width="' + stroke + '"/>';
      out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
        'stroke="url(#rg' + uid + '_' + i + ')" stroke-width="' + stroke + '" stroke-linecap="round" ' +
        'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - p)) + '" ' +
        'style="transition:stroke-dashoffset .9s cubic-bezier(.22,.68,.32,1)"/>';
    });
    out += '</svg>';
    if (o.center) out += '<div class="rings__mid">' + o.center + '</div>';
    out += '</div>';
    return out;
  }
  function lineKcal(size, v, goal, opts) {
    const o = opts || {};
    const stroke = o.stroke || 16, r = size / 2 - stroke / 2 - 4;
    const C = 2 * Math.PI * r;
    const p = U.clamp(v / (goal || 1), 0, 1.25);
    const over = v > goal;
    const col = over ? '#ff3b62' : p > 0.85 ? '#ffc542' : (o.color || '#2f7bff');
    const g = gId();
    let out = '<div class="kcal-dial" style="width:' + size + 'px;height:' + size + 'px">';
    out += '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)">';
    out += '<defs><linearGradient id="d' + g + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + col + '"/><stop offset="1" stop-color="' + lighten(col) + '"/></linearGradient></defs>';
    out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="' + stroke + '"/>';
    /* пунктирная цель */
    out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + (r - 13) + '" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1" stroke-dasharray="3 5"/>';
    out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#d' + g + ')" ' +
      'stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - Math.min(1, p))) + '" ' +
      'style="transition:stroke-dashoffset 1s cubic-bezier(.22,.68,.32,1)"/>';
    out += '</svg>';
    out += '<div class="kcal-dial__mid"><b style="color:' + col + '">' + U.fmtNum(v) + '</b>' +
      '<span>ИЗ '+ U.fmtNum(goal) +'</span><em>' + Math.round(p * 100) + '%</em></div>';
    out += '</div>';
    return out;
  }
  /* шкала 0..max со стрелкой позиции (ИМТ, здоровый вес) */
  function gaugeBar(size, pos, opts) {
    const o = opts || {};
    const h = o.h || 9;
    return '<div class="gauge" style="height:' + (h + 6) + 'px">' +
      '<div class="goal-path"><div class="goal-path__rail" style="background:' + (o.rail || 'linear-gradient(90deg,rgba(255,59,98,.3),rgba(255,197,66,.3),rgba(46,230,168,.32))') + '">' +
      '<div class="goal-path__fill" style="width:' + U.clamp(pos, 0, 100) + '%;background:' + (o.fill || 'linear-gradient(90deg,var(--ac-dk),var(--ac),var(--ac-lt))') + '"></div>' +
      '<div class="goal-path__now" style="left:calc(' + U.clamp(pos, 0, 100) + '% - 1.5px)"></div>' +
      '</div><div class="goal-path__ends"><b>' + U.esc(o.left || '') + '</b><b>' + U.esc(o.right || '') + '</b></div></div></div>';
  }

  let gidN = 0;
  function gId(skip) { return ++gidN; }
  function lighten(hex) {
    if (!/^#/.test(hex)) return hex;
    const c = hex.replace('#', '');
    const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    const r = Math.min(255, ((n >> 16) & 255) + 55);
    const g = Math.min(255, ((n >> 8) & 255) + 55);
    const b = Math.min(255, (n & 255) + 55);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ── 4. КАЛОРИЙНЫЙ ДИАЛЕТ для макросов ── */
  function macroBar(name, icon, color, val, goal, unit) {
    const p = goal ? U.clamp(val / goal, 0, 1) : 0;
    const over = val > goal;
    return '<div class="macro">' +
      '<div class="macro__ic" style="background:' + color + '22;border-color:' + color + '55;color:' + color + '">' + icon + '</div>' +
      '<div class="macro__b"><b>' + name + '</b><div class="bar' + (over ? ' bar--blood' : '') + '">' +
      '<i style="width:' + (p * 100) + '%;background:' + (over ? 'linear-gradient(90deg,#8c0f2c,' + color + ')' : 'linear-gradient(90deg,rgba(255,255,255,.14),' + color + ')') + '"></i>' +
      '</div></div>' +
      '<div class="macro__v">' + U.round(val, val >= 100 ? 0 : 1) + ' <span>/ ' + goal + ' ' + (unit || 'г') + '</span></div></div>';
  }

  /* ── 5. МЕЛОЧНЫЙ ТАЙМЕР ── */
  let timerId = null;
  function timer(seconds, onDone) {
    let left = seconds;
    return new Promise(function (res) {
      const host = $('#toasts');
      const t = el('div', { class: 'toast toast--good', style: 'min-width:190px;text-align:center' });
      t.innerHTML = '<div class="toast__tag">ТАЙМЕР</div><div style="font-family:var(--f-hud);font-size:30px;line-height:1.1" id="tmv">' +
        U.mmss(left) + '</div>';
      host.appendChild(t);
      timerId = setInterval(function () {
        left--;
        const n = $('#tmv', t);
        if (n) n.textContent = U.mmss(left);
        if (left === 10) SFX.play('tick');
        if (left <= 0) {
          clearInterval(timerId);
          t.classList.add('is-out'); setTimeout(() => t.remove(), 350);
          SFX.play('win');
          if (onDone) onDone();
          res();
        }
      }, 1000);
    });
  }
  function clearTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  /* ── 6. КОПИРОВАНИЕ ── */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => ok('Скопировано')).catch(() => fallback());
    } else fallback();
    function fallback() {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok('Скопировано'); } catch (e) { warn('Не удалось скопировать'); }
      ta.remove();
    }
  }

  return { alert, xpAlert, levelUpAlert, achAlert, ok, warn, info, TAGS,
           modal, closeModal, confirm, rings, lineKcal, gaugeBar, macroBar, lighten, timer, clearTimer, copy };
})();
