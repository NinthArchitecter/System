/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/weight.js  ·  ВЕС, ЗАМЕРЫ, ЦЕЛЬ
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.weight = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;
  let range = 30;      // дней на графике
  let showMA = true;
  let bodyOpen = false;

  /* ── МОДАЛКА ВЗВЕШИВАНИЯ ── */
  function weighModal(date) {
    const d = date || U.today();
    const ex = Store.weightOn(d);
    const s = Store.snapshot();
    const prev = prevWeight(d);
    const diff = ex && prev ? U.round(ex.kg - prev, 1) : (prev ? U.round(U.num(Store.weightOn(U.addDays(d, -1)) && Store.weightOn(U.addDays(d, -1)).kg, prev) , 1) : null);

    UI.modal({
      title: 'ЗАМЕР ВЕСА · ' + U.fmtDateFull(d).toUpperCase(),
      html:
        '<div class="form-grid" style="margin-bottom:14px">' +
          '<div class="field"><label>Вес, кг</label>' +
            '<input class="inp inp--num" id="wKg" type="number" step="0.1" min="25" max="350" inputmode="decimal" ' +
            'value="' + (ex ? ex.kg : (prev || s.weight || '')) + '" placeholder="82.4"></div>' +
          '<div class="field"><label>Процент жира, %</label>' +
            '<input class="inp inp--num" id="wFat" type="number" step="0.1" min="2" max="60" inputmode="decimal" ' +
            'value="' + (ex && ex.fat !== null ? ex.fat : '') + '" placeholder="18.5"></div>' +
        '</div>' +
        (diff !== null && !isNaN(diff) ? '<div class="alert-line">Изменение с прошлого замера: <b class="' +
          (diff < 0 ? 'up' : diff > 0 ? 'down' : 'flat') + '">' + U.signed(diff, 1, ' кг') + '</b></div>' : '') +
        '<div class="field"><label>Заметка</label>' +
          '<textarea class="ta" id="wNote" placeholder="утро натощак / после тренировки…" style="min-height:58px">' +
          (ex ? U.esc(ex.note || '') : '') + '</textarea></div>' +
        '<div class="modal__foot">' +
          (ex ? '<button class="btn btn--danger btn--sm" id="wDel">Удалить</button>' : '') +
          '<button class="btn btn--ghost btn--sm" data-close>Отмена</button>' +
          '<button class="btn btn--sm" id="wOk">Сохранить</button></div>',
      onMount: function (b) {
        const inp = U.$('#wKg', b);
        inp.focus(); inp.select();
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') U.$('#wOk', b).click(); });
        U.$('#wOk', b).addEventListener('click', function () {
          const kg = U.num(inp.value, 0);
          const fat = U.$('#wFat', b).value;
          const note = U.$('#wNote', b).value;
          const res = Store.logWeight(d, kg, fat, note);
          UI.closeModal();
          if (!res.ok) { UI.warn('Ошибка', res.msg); return; }
          if (res.updated) UI.ok('Замер обновлён', res.delta ? U.signed(res.delta, 1, ' кг') + ' к предыдущему' : '');
          else { SFX.play('add'); UI.xpAlert(C.XP.weight, 'Вес зафиксирован'); }
          Store.checkQuests(d);
          App.afterAction();
        });
        if (ex) U.$('#wDel', b).addEventListener('click', function () {
          Store.delWeight(ex.id); UI.closeModal(); UI.ok('Запись удалена'); App.afterAction();
        });
      }
    });
  }
  function prevWeight(date) {
    const all = Store.weightAll().filter(w => w.date < date);
    return all.length ? all[all.length - 1].kg : null;
  }

  /* ── МОДАЛКА ЗАМЕРОВ ── */
  function bodyModal(date) {
    const d = date || U.today();
    const ex = Store.bodyOn(d);
    const last = Store.latestBody();
    UI.modal({
      title: 'ЗАМЕРЫ ТЕЛА · ' + U.fmtDateFull(d).toUpperCase(),
      html:
        '<p class="t-xs t-mute mb2">Сантиметры. Обхват талии — главный индикатор жира, он точнее весов.</p>' +
        '<div class="form-grid">' + Store.BODY_FIELDS.map(function (f) {
          const v = ex && ex[f.k] !== undefined ? ex[f.k] : '';
          const prev = last && last[f.k] !== undefined ? last[f.k] : '';
          return '<div class="field"><label>' + f.n + ', см</label>' +
            '<input class="inp inp--num" data-b="' + f.k + '" type="number" step="0.5" min="20" max="250" value="' + v + '" placeholder="' + prev + '"></div>';
        }).join('') + '</div>' +
        '<div class="modal__foot">' +
          (ex ? '<button class="btn btn--danger btn--sm" id="bDel">Удалить</button>' : '') +
          '<button class="btn btn--ghost btn--sm" data-close>Отмена</button>' +
          '<button class="btn btn--sm" id="bOk">Сохранить</button></div>',
      onMount: function (b) {
        U.$('#bOk', b).addEventListener('click', function () {
          const data = {};
          $$('[data-b]', b).forEach(function (i) { if (i.value !== '') data[i.getAttribute('data-b')] = i.value; });
          if (!Object.keys(data).length) { UI.warn('Ничего не заполнено'); return; }
          Store.logBody(d, data);
          UI.closeModal();
          SFX.play('add');
          UI.xpAlert(C.XP.measure, 'Замеры тела');
          App.afterAction();
        });
        if (ex) U.$('#bDel', b).addEventListener('click', function () {
          Store.delBody(ex.id); UI.closeModal(); UI.ok('Замер удалён'); App.afterAction();
        });
      }
    });
  }

  /* ── МОДАЛКА ЦЕЛИ ── */
  function goalModal() {
    const g = Store.goal(), p = Store.profile();
    const w = Store.currentWeight() || p.startWeight || 80;
    const mk = C.macroTarget(Object.assign({}, p, g), w);
    const preview = function (mode, rate) {
      const pp = Object.assign({}, p, g, { mode: mode, ratePerWeek: rate });
      const m = C.macroTarget(pp, w);
      return { kcal: m.kcal, p: m.protein, f: m.fat, c: m.carbs };
    };
    UI.modal({
      title: 'ПАРАМЕТРЫ ЦЕЛИ',
      html:
        '<div class="form-grid">' +
          '<div class="field" style="grid-column:1/-1"><label>Режим</label>' +
            '<select class="sel" id="gMode">' +
              '<option value="cut"' + (g.mode === 'cut' ? ' selected' : '') + '>Сушка (дефицит)</option>' +
              '<option value="maintain"' + (g.mode === 'maintain' ? ' selected' : '') + '>Поддержание</option>' +
              '<option value="bulk"' + (g.mode === 'bulk' ? ' selected' : '') + '>Набор массы</option>' +
            '</select></div>' +
          '<div class="field"><label>Текущий вес, кг</label><input class="inp inp--num" id="gCur" type="number" step="0.1" value="' + (w || '') + '"></div>' +
          '<div class="field"><label>Стартовый вес, кг</label><input class="inp inp--num" id="gStart" type="number" step="0.1" value="' + (g.startWeight || w || '') + '"></div>' +
          '<div class="field"><label>Целевой вес, кг</label><input class="inp inp--num" id="gTarget" type="number" step="0.1" value="' + (g.targetWeight || '') + '" placeholder="75"></div>' +
          '<div class="field"><label>Дедлайн</label><input class="inp" id="gDate" type="date" value="' + (g.deadline || '') + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Скорость: <b id="gRateLbl" class="t-hud">' + (g.ratePerWeek || 0.7).toFixed(1) + '</b> кг в неделю</label>' +
            '<input type="range" id="gRate" min="0.1" max="1.5" step="0.1" value="' + (g.ratePerWeek || 0.7) + '" style="width:100%">' +
            '<div class="row" style="justify-content:space-between"><span class="t-xs t-mute">0.1 · мягко</span><span class="t-xs t-mute">1.5 · агрессивно</span></div></div>' +
        '</div>' +
        '<div class="hr"></div>' +
        '<div class="lbl mb1">Расчёт системы</div>' +
        '<div class="quest-stats" id="gPrev">' + prevStats(preview(g.mode, g.ratePerWeek || 0.7)) + '</div>' +
        '<div class="modal__foot">' +
          '<button class="btn btn--ghost btn--sm" data-close>Отмена</button>' +
          '<button class="btn btn--sm" id="gOk">Применить</button></div>',
      onMount: function (b) {
        const upd = function () {
          const mode = U.$('#gMode', b).value;
          const rate = U.num(U.$('#gRate', b).value, 0.7);
          U.$('#gRateLbl', b).textContent = rate.toFixed(1);
          U.$('#gPrev', b).innerHTML = prevStats(preview(mode, rate));
        };
        U.$('#gMode', b).addEventListener('change', upd);
        U.$('#gRate', b).addEventListener('input', upd);
        U.$('#gOk', b).addEventListener('click', function () {
          Store.saveGoal({
            mode: U.$('#gMode', b).value,
            startWeight: U.num(U.$('#gStart', b).value, null) || null,
            targetWeight: U.num(U.$('#gTarget', b).value, null) || null,
            deadline: U.$('#gDate', b).value,
            ratePerWeek: U.num(U.$('#gRate', b).value, 0.7)
          });
          const cw = U.num(U.$('#gCur', b).value, 0);
          if (cw && !Store.weightOn(U.today())) Store.logWeight(U.today(), cw, '', 'из цели');
          UI.closeModal();
          UI.ok('Цель обновлена', 'Система пересчитала калории и макросы.');
          App.afterAction();
        });
      }
    });
  }
  function prevStats(m) {
    return '<div class="qs"><b>' + U.fmtNum(m.kcal) + '</b><span>ККАЛ / ДЕНЬ</span></div>' +
      '<div class="qs"><b>' + m.p + '</b><span>БЕЛОК, Г</span></div>' +
      '<div class="qs"><b>' + m.f + '</b><span>ЖИРЫ, Г</span></div>' +
      '<div class="qs"><b>' + m.c + '</b><span>УГЛЕВОДЫ, Г</span></div>';
  }

  /* ── ГЕРОЙ ВЕСА ── */
  function hero(s) {
    const all = Store.weightAll();
    const cur = s.weight, start = s.start, target = s.target;
    const last = all.length ? all[all.length - 1] : null;
    const prev = all.length > 1 ? all[all.length - 2] : null;
    const d = prev ? U.round(cur - prev.kg, 1) : null;
    const first = all.length ? all[0] : null;
    const min = all.length ? U.min.apply(null, all.map(w => w.kg)) : null;
    const max = all.length ? U.max.apply(null, all.map(w => w.kg)) : null;

    return '<div class="panel"><div class="panel__body">' +
      '<div class="wl-hero">' +
        '<div>' +
          '<div class="lbl">Текущий вес · скользящее среднее 7 дней</div>' +
          '<div class="wl-hero__n" id="wHero">' + U.fmtKg(s.ma.length ? s.ma[s.ma.length - 1] : cur) + '<em>кг</em></div>' +
          '<div class="wl-hero__d">' +
            (d !== null ? '<span class="delta-chip ' + (d < 0 ? 'up' : d > 0 ? 'down' : 'flat') + '">' +
              '<i class="ico" data-ico="' + (d <= 0 ? 'down' : 'up') + '" style="width:13px;height:13px"></i>' +
              U.signed(d, 1) + ' за день</span>' : '') +
            '<span class="tag">старт ' + (start || '—') + '</span>' +
            '<span class="tag ' + (target && cur <= target ? 'tag--green' : '') + '">цель ' + (target || '—') + '</span>' +
            (s.rate !== null ? '<span class="tag ' + (s.rate < -0.1 ? 'tag--green' : s.rate > 0.3 ? 'tag--blood' : 'tag--gold') + '">тренд ' + U.signed(s.rate, 2) + ' кг/нед</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div class="goal-path" style="min-width:230px"><div class="goal-path__rail">' +
            '<div class="goal-path__fill" style="width:' + s.progress + '%"></div>' +
            '<div class="goal-path__now" style="left:calc(' + s.progress + '% - 1.5px)"></div></div>' +
            '<div class="goal-path__ends"><b>' + (start || '—') + '</b><b>' + (target || '—') + '</b></div></div>' +
          '<div class="t-xs t-mute mt1">' + (s.eta ? 'прогноз: ' + U.fmtDate(s.eta) : 'прогноз по тренду недоступен') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="grid g4 mt3">' +
        mini('Замеров', all.length, '') +
        mini('Максимум', max !== null ? U.fmtKg(max) : '—', 'кг') +
        mini('Минимум', min !== null ? U.fmtKg(min) : '—', 'кг') +
        mini('Потеряно', U.fmtKg(s.stats.totalLost, 1), 'кг · ' + s.stats.lostPct + '%') +
      '</div></div></div>';
  }
  function mini(l, v, u) {
    return '<div class="qs"><b>' + v + (u ? ' <span style="font-size:11px;color:var(--tx-mute)">' + u.split(' · ')[0] + '</span>' : '') + '</b><span>' + l + '</span></div>';
  }

  /* ── ГРАФИК ВЕСА ── */
  function chartBlock(s) {
    const all = Store.weightAll();
    const from = U.addDays(U.today(), -(range - 1));
    const data = all.filter(w => w.date >= from).map(function (w) {
      const ma = Store.maSeries(7);
      const idx = all.indexOf(w);
      return {
        y: w.kg, label: U.parseISO(w.date).getDate(),
        title: U.fmtDateFull(w.date),
        tip: [
          ['вес', U.fmtKg(w.kg) + ' кг', '#2f7bff'],
          ['среднее 7д', ma[idx] ? U.fmtKg(ma[idx]) + ' кг' : '—', '#25e0f5']
        ].concat(w.fat ? [['жир', w.fat + '%', '#ff8a3d']] : [])
          .concat(w.note ? [['заметка', U.esc(w.note), '#93a2cc']] : [])
      };
    });
    const maData = showMA ? all.filter(w => w.date >= from).map(function (w, i, arr) {
      const idx = all.indexOf(w);
      const ma = Store.maSeries(7);
      return { y: ma[idx], label: U.parseISO(w.date).getDate(), title: U.fmtDateFull(w.date) + ' · среднее', tip: [['среднее 7д', U.fmtKg(ma[idx]) + ' кг', '#25e0f5']] };
    }) : null;

    const bands = [];
    if (s.healthy.max) bands.push({ from: s.healthy.min, to: s.healthy.max, color: 'rgba(46,230,168,.07)' });

    return '<div class="panel"><div class="panel__head"><h3>Динамика веса</h3><span class="grow"></span>' +
      '<div class="seg" id="wRange">' +
        [14, 30, 90, 365].map(function (r) {
          return '<button data-r="' + r + '" class="' + (r === range ? 'is-on' : '') + '">' + (r === 365 ? 'год' : r + ' дн') + '</button>';
        }).join('') +
      '</div>' +
      '<button class="chip ' + (showMA ? 'is-on' : '') + '" id="wMa">среднее</button>' +
      '</div><div class="panel__body">' +
      (data.length ? '<div id="wChart"></div>' + '<div class="row mt2" style="gap:14px">' +
        '<span class="t-xs t-mute"><i style="display:inline-block;width:12px;height:2px;background:#2f7bff;margin-right:5px"></i>замеры</span>' +
        (showMA ? '<span class="t-xs t-mute"><i style="display:inline-block;width:12px;height:2px;background:#25e0f5;margin-right:5px"></i>среднее 7 дней</span>' : '') +
        '<span class="t-xs t-mute"><i style="display:inline-block;width:12px;height:8px;background:rgba(46,230,168,.25);margin-right:5px"></i>здоровая зона</span>' +
        '</div>' : U.empty('scale', 'Нет замеров', 'Нажми «Взвеситься» и сделай первую запись — система начнёт строить график.')) +
      '</div></div>';
  }

  /* ── ТАБЛИЦА ЗАМЕРОВ ── */
  function table() {
    const all = Store.weightAll().slice().reverse();
    if (!all.length) return '<div class="panel"><div class="panel__body">' +
      U.empty('ruler', 'История пуста', '') + '</div></div>';
    const ma = Store.maSeries(7);
    const rows = all.slice(0, 60).map(function (w, i) {
      const idx = all.length - 1 - i;
      const prev = all[idx - 1];
      const d = prev ? U.round(w.kg - prev.kg, 1) : null;
      const isToday = w.date === U.today();
      return '<tr class="' + (isToday ? 'wl-row-today' : '') + '" data-wid="' + w.id + '" style="cursor:pointer">' +
        '<td><b>' + U.fmtDateShort(w.date) + '</b><span class="t-xs t-mute" style="display:block">' + U.DOW[U.parseISO(w.date).getDay()] + (isToday ? ' · сегодня' : '') + '</span></td>' +
        '<td class="num"><b>' + U.fmtKg(w.kg) + '</b></td>' +
        '<td class="num">' + (d === null ? '—' : '<span class="delta-chip ' + (d < 0 ? 'up' : d > 0 ? 'down' : 'flat') + '">' + U.signed(d, 1) + '</span>') + '</td>' +
        '<td class="num">' + (ma[idx] ? U.fmtKg(ma[idx]) : '—') + '</td>' +
        '<td class="num">' + (w.fat !== null && w.fat !== undefined ? w.fat + '%' : '—') + '</td>' +
        '<td class="t-xs t-mute">' + U.esc(w.note || '') + '</td>' +
        '<td class="num t-mute">' + (idx > 0 ? Math.round(U.diffDays(all[idx - 1].date, w.date)) + ' д' : '—') + '</td></tr>';
    }).join('');
    return '<div class="panel"><div class="panel__head"><h3>История замеров</h3><span class="grow"></span>' +
      '<span class="tag">' + all.length + '</span></div>' +
      '<div class="tbl-wrap"><table class="tbl wl-tbl"><thead><tr>' +
        '<th>Дата</th><th class="num">Вес</th><th class="num">Δ</th><th class="num">Среднее 7д</th><th class="num">Жир</th><th>Заметка</th><th class="num">Интервал</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  /* ── ЗАМЕРЫ ТЕЛА ── */
  function bodyBlock(s) {
    const all = Store.bodyAll();
    const last = Store.latestBody();
    const first = all.length ? all[0] : null;
    const d = (last && first && first !== last) ? U.round((last.waist || 0) - (first.waist || 0), 1) : null;
    const cards = Store.BODY_FIELDS.map(function (f) {
      const v = last ? last[f.k] : null;
      const v0 = first ? first[f.k] : null;
      const dd = (v !== null && v0 !== null) ? U.round(v - v0, 1) : null;
      return '<div class="qs" style="text-align:left"><b style="color:' + (dd !== null && dd < 0 ? 'var(--green)' : 'inherit') + '">' +
        (v === null ? '—' : U.round(v, 1)) + ' <span style="font-size:11px;color:var(--tx-mute)">см</span></b>' +
        '<span>' + f.n.toUpperCase() + (dd !== null ? ' · ' + U.signed(dd, 1) : '') + '</span></div>';
    }).join('');

    const chart = all.length >= 2 ? '<div id="bChart" class="mt2"></div>' : '';

    return '<div class="panel"><div class="panel__head"><h3>Замеры тела</h3><span class="grow"></span>' +
      (last ? '<span class="tag">' + U.agoLabel(last.date) + '</span>' : '') +
      '<button class="btn btn--ghost btn--xs" id="wBodyBtn"><i class="ico" data-ico="ruler"></i>' + (last && last.date === U.today() ? 'Изменить' : 'Замерить') + '</button></div>' +
      '<div class="panel__body">' +
      (all.length ? '<div class="quest-stats">' + cards + '</div>' + chart
        : U.empty('ruler', 'Замеров нет', 'Обхват талии — самый честный показатель жира. Добавляй раз в неделю утром натощак.')) +
      '</div></div>';
  }

  /* ── ПРАВИЛА (как считать правильно) ── */
  function rules() {
    return '<div class="panel"><div class="panel__head"><h3>Правила взвешивания</h3></div><div class="panel__body">' +
      '<ul class="brief" style="padding:0;background:none;border:0">' +
        '<li>Утром, натощак, после туалета — вес минимален и наиболее стабилен.</li>' +
        '<li>В одно и то же время каждый день. Время: <b>' +
          (Store.settings().weighIn === 'morning' ? 'сразу после пробуждения' : 'перед сном') + '</b>.</li>' +
        '<li>Смотри на <b>среднее за 7 дней</b>, а не на одну цифру: вода и соль дают ±1,5 кг.</li>' +
        '<li>Нормальный «плато» — 7–10 дней без тренда. Не снижай калории раньше времени.</li>' +
        '<li>Замеры тела раз в неделю, утром, натощак, лента всегда в одном месте.</li>' +
      '</ul></div></div>';
  }

  /* ── RENDER ── */
  function render(host) {
    const s = Store.snapshot();
    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Вес и замеры</h1>' +
        '<p>Главный показатель — тренд скользящего среднего, а не отдельные колебания. Система считает его автоматически.</p>' +
      '</div><div class="row">' +
        '<button class="btn btn--ghost btn--sm" id="wGoalBtn"><i class="ico" data-ico="target"></i>Цель</button>' +
        '<button class="btn btn--sm" id="wAddBtn"><i class="ico" data-ico="plus"></i>Взвеситься</button>' +
      '</div></div>' +

      hero(s) +
      '<div class="grid g-2-1 mt3">' +
        chartBlock(s) +
        '<div class="stack">' +
          '<div class="tile" data-rv><div class="tile__ico"><i class="ico" data-ico="pulse"></i></div>' +
            '<div class="tile__lbl">Тренд за неделю</div>' +
            '<div class="tile__val" style="color:' + (s.rate !== null && s.rate < 0 ? 'var(--green)' : 'var(--gold)') + '">' +
            (s.rate === null ? '—' : U.signed(s.rate, 2)) + '<em>кг</em></div>' +
            '<div class="tile__sub">' + rateAdvice(s.rate, s.goal.mode) + '</div>' +
            '<div class="mt1">' + Chart.spark(s.ma.slice(-30), 150, 30,
              s.rate !== null && s.rate < 0 ? '#2ee6a8' : '#ffc542') + '</div></div>' +
          '<div class="tile" data-rv><div class="tile__ico"><i class="ico" data-ico="scale"></i></div>' +
            '<div class="tile__lbl">ИМТ</div>' +
            '<div class="tile__val">' + (s.bmi || '—') + '</div>' +
            '<div class="tile__sub">' + s.bmiCat.label + '</div>' +
            '<div class="mt2">' + UI.gaugeBar(0, C.bmiPos(s.bmi), { left: '15', right: '40' }) + '</div></div>' +
          '<div class="tile" data-rv><div class="tile__ico"><i class="ico" data-ico="crown"></i></div>' +
            '<div class="tile__lbl">Серия взвешиваний</div>' +
            '<div class="tile__val">' + s.streak + '<em>дн.</em></div>' +
            '<div class="tile__sub">рекорд: ' + s.bestStreak + ' дн.</div>' +
            '<div class="week-dots mt2">' + weekDots(s) + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-2-1 mt3">' +
        '<div>' + table() + '</div>' +
        '<div class="stack">' + bodyBlock(s) + rules() + '</div>' +
      '</div>';
  }
  function rateAdvice(rate, mode) {
    if (rate === null) return 'Мало данных, нужен минимум 4 замера';
    if (mode === 'bulk') return rate > 0.05 ? 'Набор идёт в графике' : 'Набор притормозил — добавь калорий';
    if (rate < -1.0) return 'Слишком быстро: риск потери мышц. Добавь калорий.';
    if (rate < -0.25 && rate > -1.0) return 'Оптимальная зона для похудения';
    if (Math.abs(rate) <= 0.25) return 'Плато. Проверь калории, сон и активность.';
    return 'Вес растёт — проверь режим и дефицит';
  }
  function weekDots(s) {
    let out = '';
    for (let i = 6; i >= 0; i--) {
      const d = U.addDays(U.today(), -i);
      const has = !!Store.weightOn(d);
      const isToday = d === U.today();
      out += '<i class="' + (has ? 'is-done ' : '') + (isToday ? 'is-today' : '') + '" title="' + U.fmtDate(d) + '">' +
        U.DOW[U.parseISO(d).getDay()][0] + '</i>';
    }
    return out;
  }

  /* ── MOUNT ── */
  function mount(host) {
    const draw = function () {
      const s = Store.snapshot();
      const all = Store.weightAll();
      const from = U.addDays(U.today(), -(range - 1));
      const ma = Store.maSeries(7);
      const pts = all.filter(w => w.date >= from);
      const c = U.$('#wChart', host);
      if (c) {
        const series = [];
        if (showMA) {
          pts.forEach(function (w) {
            const i = all.indexOf(w);
            if (i < 2) return;
            series.push({ y: ma[i], label: U.parseISO(w.date).getDate(), title: U.fmtDateFull(w.date),
              tip: [['среднее 7д', U.fmtKg(ma[i]) + ' кг', '#25e0f5']] });
          });
        }
        const raw = pts.map(function (w) {
          return { y: w.kg, label: U.parseISO(w.date).getDate(), title: U.fmtDateFull(w.date),
            tip: [['вес', U.fmtKg(w.kg) + ' кг', '#2f7bff']]
              .concat(showMA && ma[all.indexOf(w)] ? [['среднее', U.fmtKg(ma[all.indexOf(w)]) + ' кг', '#25e0f5']] : [])
              .concat(w.fat ? [['жир', w.fat + '%', '#ff8a3d']] : []) };
        });
        if (showMA && series.length) {
          Chart.line(c, { data: series, height: 236, color: '#25e0f5', area: false, dots: false, yPad: .16, unit: ' кг' });
          const c2 = document.createElement('div');
          c.parentNode.appendChild(c2);
          Chart.line(c2, { data: raw, height: 236, color: '#2f7bff', area: true, yPad: .16, xTicks: 6, unit: ' кг',
            goal: s.target ? { v: s.target, label: 'цель ' + s.target + ' кг' } : null,
            bands: s.healthy.max ? [{ from: s.healthy.min, to: s.healthy.max }] : null });
        } else {
          Chart.line(c, { data: raw, height: 236, color: '#2f7bff', area: true, yPad: .16, unit: ' кг',
            goal: s.target ? { v: s.target, label: 'цель ' + s.target + ' кг' } : null,
            bands: s.healthy.max ? [{ from: s.healthy.min, to: s.healthy.max }] : null });
        }
      }
      /* график замеров */
      const bc = U.$('#bChart', host);
      if (bc) {
        const body = Store.bodyAll();
        const f = body[0];
        const l = body[body.length - 1];
        const keys = Store.BODY_FIELDS.filter(function (x) { return f[x.k] !== undefined && l[x.k] !== undefined; });
        Chart.line(bc, { data: keys.map(function (k) {
          return { y: l[k.k], label: k.n, title: k.n, tip: [['сейчас', U.round(l[k.k], 1) + ' см', '#2f7bff'], ['в начале', U.round(f[k.k], 1) + ' см', '#93a2cc'], ['изменение', U.signed(U.round(l[k.k] - f[k.k], 1), 1, ' см'), l[k.k] < f[k.k] ? '#2ee6a8' : '#ff3b62']] };
        }), height: 180, dots: true, yPad: .3, unit: ' см', area: true });
      }
    };
    draw();

    U.on(host, 'click', '#wAddBtn', () => weighModal(U.today()));
    U.on(host, 'click', '#wGoalBtn', () => goalModal());
    U.on(host, 'click', '#wBodyBtn', () => bodyModal(U.today()));
    U.on(host, 'click', '#wRange button', function (e, b) {
      range = U.num(b.getAttribute('data-r'), 30);
      $$('#wRange button', host).forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      draw();
    });
    U.on(host, 'click', '#wMa', function (e, b) {
      showMA = !showMA;
      b.classList.toggle('is-on', showMA);
      const c = U.$('#wChart', host);
      if (c && c.parentNode) { const ex = c.parentNode.querySelectorAll('.chart-box'); ex.forEach(x => { if (x !== c) x.remove(); }); c.innerHTML = ''; }
      draw();
    });
    U.on(host, 'click', 'tbody tr[data-wid]', function (e, tr) {
      const all = Store.weightAll();
      const w = all.find(x => x.id === tr.getAttribute('data-wid'));
      if (w) weighModal(w.date);
    });
  }

  return { render, mount, weighModal, goalModal, bodyModal };
})();
