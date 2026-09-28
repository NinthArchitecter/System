/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/training.js  ·  ТРЕНИРОВКИ
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.training = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;
  const X = window.DB_EX;
  let curDate = null;
  let draft = { name: '', planId: '', duration: 45, group: 'full', ex: [], note: '' };
  let openEx = {};        // раскрытые упражнения в черновике
  let openHist = {};

  function date() { return curDate || U.today(); }

  /* ── ЧЕРНОВИК ТРЕНИРОВКИ ── */
  function newDraft(planId) {
    const plan = X.plans.find(p => p.id === planId) || X.plans.find(p => p.id === Store.activePlan()) || X.plans[0];
    const nsets = X.defaultSets[plan.type] || 3;
    draft = { name: plan.name, planId: plan.id, duration: 45, group: plan.split === 'push' ? 'chest' : plan.split === 'cardio' ? 'cardio' : 'full', ex: [], note: '' };
    const ids = (plan.ex || []).slice();
    (plan.exLow ? ids.concat(plan.exLow.slice(0, 3)) : null);
    ids.forEach(function (id) {
      const e = X.byId[id];
      if (!e) return;
      const last = Store.lastUsedSets(id);
      const sets = [];
      const n = e.mode === 'time' ? 3 : nsets;
      for (let i = 0; i < n; i++) {
        if (last && last[i]) sets.push({ kg: last[i].kg, reps: last[i].reps, time: 0 });
        else sets.push(e.mode === 'time' ? { kg: 0, reps: 0, time: 45 } : { kg: 0, reps: 12, time: 0 });
      }
      draft.ex.push({ id: e.id, name: e.name, mode: e.mode, sets: sets, done: false });
      openEx[e.id] = true;
    });
  }

  function calcVolume(d) {
    let v = 0;
    (d.ex || []).forEach(function (e) {
      (e.sets || []).forEach(function (s) {
        if (e.mode === 'time') v += 0;
        else v += (U.num(s.kg, 0) * U.num(s.reps, 0));
      });
    });
    return Math.round(v);
  }
  function kcal(d) {
    /* смешанный расчёт: силовая часть по MET группы + кардио по времени */
    let k = 0;
    (d.ex || []).forEach(function (e) {
      const t = e.mode === 'time' ? U.sum(e.sets.map(s => s.time || 0)) / 60
        : U.sum(e.sets.map(s => s.reps || 0)) * 3 / 60;  // ~3 сек на повтор
      const g = X.exGroup(e.id);
      k += C.workoutKcal(Math.max(1, Math.round(t * 60)), Store.currentWeight(), g);
    });
    if (k === 0) k = C.workoutKcal(d.duration, Store.currentWeight(), d.group);
    return Math.round(k * (d.duration ? U.clamp(d.duration / 60, 0.4, 1.6) : 1));
  }

  /* ── ПАНЕЛЬ СЕССИИ ── */
  function sessionBlock(s) {
    const v = calcVolume(draft), k = kcal(draft);
    const doneEx = draft.ex.filter(e => e.done).length;
    const totalSets = U.sum(draft.ex.map(e => e.sets.length));

    return '<div class="session-head">' +
      '<div class="win__lvl" style="width:76px;height:76px"><b style="font-size:26px">' + doneEx + '</b><i>/' + draft.ex.length + '</i></div>' +
      '<div style="flex:1;min-width:0">' +
        '<h3>' + U.esc(draft.name || 'Тренировка') + '</h3>' +
        '<div class="t-xs t-mute mt1">' + U.fmtDateFull(date()) + ' · ' + totalSets + ' подходов · объём <b class="t-hud" style="color:var(--tx-dim)">' + U.fmtNum(v) + ' кг</b></div>' +
        '<div class="row mt1" style="gap:6px">' +
          '<span class="tag tag--gold">' + k + ' ккал</span>' +
          '<span class="tag">' + draft.duration + ' мин</span>' +
          '<span class="tag">' + (X.M[X.exGroup(draft.ex[0] && draft.ex[0].id)] || 'всё тело') + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn btn--green btn--sm" id="wFinish"><i class="ico" data-ico="check"></i>Завершить</button>' +
        '<button class="btn btn--ghost btn--sm" id="wDiscard">Очистить</button>' +
      '</div></div>';
  }

  /* ── УПРАЖНЕНИЯ ЧЕРНОВИКА ── */
  function exList() {
    if (!draft.ex.length) return '<div class="panel"><div class="panel__body">' +
      U.empty('sword', 'Нет упражнений', 'Добавь упражнения кнопкой ниже или начни с плана тренировок.') + '</div></div>';

    return '<div class="stack" style="gap:11px">' + draft.ex.map(function (e, ei) {
      const best = Store.personalBest(e.id);
      const open = openEx[e.id];
      const v = e.mode === 'time' ? 0 : e.sets.length * U.avg(e.sets.map(x => U.num(x.kg, 0) * U.num(x.reps, 0)));
      return '<div class="ex" data-ex="' + e.id + '">' +
        '<div class="ex__head" data-toggle="' + e.id + '">' +
          '<span style="color:' + (e.done ? 'var(--green)' : 'var(--ac-lt)') + '">' + (e.done ? '✔' : '▸') + '</span>' +
          '<b>' + U.esc(e.name) + '</b>' +
          '<span class="meta">' + (X.M[X.exGroup(e.id)] || '') + (e.mode === 'time' ? ' · время' : '') + '</span>' +
          (best ? '<span class="pr-badge">★ ' + U.round(best, 1) + ' кг</span>' : '') +
          (e.mode !== 'time' && v ? '<span class="meta">' + Math.round(v) + ' кг</span>' : '') +
          '<button class="iconbtn" data-rmex="' + e.id + '" style="width:26px;height:26px"><i class="ico" data-ico="close" style="width:13px;height:13px"></i></button>' +
        '</div>' +
        (open ? '<div class="ex__body">' +
          '<div class="sets">' +
            '<div class="set-row"><span class="set-row__n">#</span>' +
              '<span class="set-row__n" style="background:none;border:0">KG</span>' +
              '<span class="set-row__n" style="background:none;border:0">' + (e.mode === 'time' ? 'СЕК' : 'ПОВТ') + '</span>' +
              '<span class="spacer"></span></div>' +
            e.sets.map(function (st, si) {
              return '<div class="set-row">' +
                '<span class="set-row__n">' + (si + 1) + '</span>' +
                (e.mode === 'time' ? '' : '<input class="inp" type="number" step="0.5" min="0" value="' + st.kg + '" data-s="' + si + '" data-f="kg">') +
                '<input class="inp" type="number" step="' + (e.mode === 'time' ? 5 : 1) + '" min="0" value="' + (e.mode === 'time' ? (st.time || 45) : st.reps) + '" data-s="' + si + '" data-f="' + (e.mode === 'time' ? 'time' : 'reps') + '">' +
                '<span class="x">' + (e.mode === 'time' ? '' : (U.num(st.kg, 0) * U.num(st.reps, 0)) + ' кг') + '</span>' +
                '<button class="iconbtn" data-addset="' + e.id + '" style="width:26px;height:26px"><i class="ico" data-ico="plus" style="width:13px;height:13px"></i></button>' +
                '<button class="iconbtn" data-delset="' + e.id + '|' + si + '" style="width:26px;height:26px"><i class="ico" data-ico="close" style="width:13px;height:13px"></i></button>' +
                '</div>';
            }).join('') +
          '</div>' +
          '<div class="row mt2"><button class="btn btn--ghost btn--xs" data-addset="' + e.id + '">+ подход</button>' +
          '<button class="btn ' + (e.done ? 'btn--green' : 'btn--ghost') + ' btn--xs" data-doneex="' + e.id + '">' +
          (e.done ? '✔ Выполнено' : 'Отметить выполненным') + '</button>' +
          (X.exMode(e.id) !== 'time' ? '<button class="btn btn--ghost btn--xs" data-pr="' + e.id + '">Запомнить как ПР</button>' : '') +
          '</div></div>' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  /* ── ДОБАВИТЬ УПРАЖНЕНИЕ ── */
  function addExModal() {
    const groups = X.M;
    UI.modal({
      title: 'ДОБАВИТЬ УПРАЖНЕНИЕ',
      html:
        '<input class="inp" id="xSearch" placeholder="Поиск: жим, присед, планка…" autocomplete="off">' +
        '<div class="chips mt2" id="xGroups">' + Object.keys(groups).map(function (g, i) {
          return '<button class="chip ' + (i === 0 ? 'is-on' : '') + '" data-g="' + g + '">' + groups[g] + '</button>';
        }).join('') + '</div>' +
        '<div class="list mt2" id="xList" style="max-height:320px;overflow-y:auto;border:1px solid var(--line);border-radius:11px"></div>',
      onMount: function (b) {
        let grp = Object.keys(groups)[0];
        function fill() {
          const q = U.$('#xSearch', b).value.trim().toLowerCase();
          const list = X.exercises.filter(function (e) {
            return e.g === grp && (!q || e.name.toLowerCase().indexOf(q) >= 0);
          });
          U.$('#xList', b).innerHTML = list.length ? list.map(e => {
            const last = Store.lastUsedSets(e.id);
            return '<div class="li li--del" data-x="' + e.id + '"><div class="li__ico">▸</div>' +
              '<div class="li__b"><b>' + U.esc(e.name) + '</b><span>' + groups[e.g] +
              (last ? ' · прошлый: ' + last.map(s => s.kg + '×' + s.reps).join(', ') : '') + '</span></div>' +
              '<div class="li__r"><b>' + (e.mode === 'time' ? 'время' : 'вес×повт') + '</b></div></div>';
          }).join('') : '<div class="empty">Нет упражнений</div>';
        }
        U.$('#xSearch', b).addEventListener('input', fill);
        U.on(U.$('#xGroups', b), 'click', '.chip', function (e, c) {
          grp = c.getAttribute('data-g');
          $$('#xGroups .chip', b).forEach(x => x.classList.remove('is-on'));
          c.classList.add('is-on'); fill();
        });
        U.on(U.$('#xList', b), 'click', '[data-x]', function (e, r) {
          addEx(r.getAttribute('data-x'));
          UI.closeModal();
        });
        fill();
      }
    });
  }
  function addEx(id) {
    if (draft.ex.some(e => e.id === id)) { UI.warn('Уже добавлено'); return; }
    const e = X.byId[id];
    if (!e) return;
    const last = Store.lastUsedSets(id);
    const sets = [];
    const n = e.mode === 'time' ? 3 : 3;
    for (let i = 0; i < n; i++) {
      sets.push(last && last[i]
        ? { kg: last[i].kg, reps: last[i].reps, time: 0 }
        : (e.mode === 'time' ? { kg: 0, reps: 0, time: 45 } : { kg: 0, reps: 12, time: 0 }));
    }
    draft.ex.push({ id: e.id, name: e.name, mode: e.mode, sets: sets, done: false });
    openEx[id] = true;
    SFX.play('tick');
    App.refresh();
  }

  /* ── НАСТРОЙКИ СЕССИИ ── */
  function settingsBlock() {
    return '<div class="panel"><div class="panel__head"><h3>Параметры сессии</h3></div><div class="panel__body">' +
      '<div class="field mb2"><label>Название</label><input class="inp" id="sName" value="' + U.esc(draft.name) + '"></div>' +
      '<div class="form-grid mb2">' +
        '<div class="field"><label>Длительность, мин</label><input class="inp inp--num" id="sDur" type="number" value="' + draft.duration + '" step="5" min="5" max="300"></div>' +
        '<div class="field"><label>Группа</label><select class="sel" id="sGroup">' +
          Object.keys(X.M).map(g => '<option value="' + g + '"' + (draft.group === g ? ' selected' : '') + '>' + X.M[g] + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="field"><label>Заметка</label><textarea class="ta" id="sNote" placeholder="Самочувствие, вес на штангe…" style="min-height:56px">' + U.esc(draft.note) + '</textarea></div>' +
      '</div></div>';
  }

  /* ── ПЛАНЫ ── */
  function plansBlock() {
    const active = Store.activePlan();
    const typeTag = { beginner:'для новичка', split:'сплит', home:'дома', cardio:'кардио', recovery:'восстановление' };
    return '<div class="panel"><div class="panel__head"><h3>Планы тренировок</h3><span class="grow"></span>' +
      '<span class="tag">активный: ' + U.esc((X.plans.find(p => p.id === active) || {}).name || 'не выбран') + '</span></div>' +
      '<div class="panel__body"><div class="plan-grid">' + X.plans.map(function (p) {
        return '<div class="plan ' + (p.id === active ? 'is-on' : '') + '">' +
          '<h4>' + U.esc(p.name) + '</h4><p>' + U.esc(p.desc) + '</p>' +
          '<div class="plan__meta"><span class="tag">' + typeTag[p.type] + '</span>' +
          '<span class="tag">' + p.days + ' дн/нед</span><span class="tag">отдых ' + p.rest + '</span></div>' +
          '<ul class="plan__ex">' + (p.ex || []).slice(0, 6).map(e => '<li>' + U.esc(X.exName(e)) + '</li>').join('') + '</ul>' +
          '<div class="row mt2">' +
            '<button class="btn btn--ghost btn--xs" data-plan="' + p.id + '">Выбрать</button>' +
            '<button class="btn btn--xs" data-planstart="' + p.id + '">Начать</button>' +
          '</div></div>';
      }).join('') + '</div>' +
      '<hr class="hr">' +
      '<div class="lbl mb1">Программа на неделю</div>' +
      '<div id="weekPlan"></div>' +
      '</div></div>';
  }
  function weekPlan() {
    const active = Store.activePlan() || 'p_upper_lower';
    const p = X.plans.find(x => x.id === active) || X.plans[0];
    const days = 7, out = [];
    const per = p.exLow ? Math.ceil((p.ex.length + p.exLow.length) / days) : Math.ceil(p.ex.length / days);
    const all = (p.ex || []).concat(p.exLow || []);
    for (let i = 0; i < days; i++) {
      const d = U.addDays(U.today(), i);
      const dow = U.parseISO(d).getDay();
      const rest = (dow === 0 && p.days < 7);
      const chunk = rest ? [] : all.slice(i * per, (i + 1) * per);
      out.push({ d: d, ex: chunk, rest: rest });
    }
    return '<div class="grid g4" style="gap:9px">' + out.map(function (o, i) {
      return '<div class="hist-day" style="flex-direction:column;align-items:flex-start;gap:6px;' +
        (o.d === U.today() ? 'border-color:var(--ac)' : '') + '">' +
        '<div class="hist-day__d"><b>' + U.parseISO(o.d).getDate() + '</b><span>' + U.DOW[U.parseISO(o.d).getDay()].toUpperCase() + '</span></div>' +
        (o.rest ? '<div class="t-xs t-mute">отдых</div>' :
          '<div class="t-xs t-dim" style="line-height:1.5">' + o.ex.map(e => '· ' + U.esc(X.exName(e))).join('<br>') + '</div>') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ── БИБЛИОТЕКА УПРАЖНЕНИЙ + ПР ── */
  function libraryBlock() {
    const done = {};
    Store.state().workouts.forEach(function (w) {
      (w.ex || []).forEach(function (e) { done[e.id] = (done[e.id] || 0) + 1; });
    });
    const list = X.exercises.slice().sort(function (a, b) { return (done[b.id] || 0) - (done[a.id] || 0); }).slice(0, 10);
    return '<div class="panel"><div class="panel__head"><h3>Личные рекорды</h3><span class="grow"></span>' +
      '<button class="btn btn--ghost btn--xs" id="wAddEx"><i class="ico" data-ico="plus" style="width:13px;height:13px"></i>Упражнение</button></div>' +
      '<div class="panel__body panel__body--tight"><div class="list">' + list.map(function (e) {
        const pr = Store.personalBest(e.id);
        return '<div class="li"><div class="li__ico">' + (done[e.id] ? '★' : '○') + '</div>' +
          '<div class="li__b"><b>' + U.esc(e.name) + '</b><span>' + X.M[e.g] + ' · выполнено ' + (done[e.id] || 0) + ' раз</span></div>' +
          '<div class="li__r"><b class="' + (pr ? 'up' : '') + '">' + (pr ? U.round(pr, 1) + ' кг' : '—') + '</b>' +
          (pr ? '<span class="pr-badge">ПР</span>' : '<span>&nbsp;</span>') + '</div></div>';
      }).join('') + '</div></div></div>';
  }

  /* ── ИСТОРИЯ ── */
  function historyBlock(s) {
    const ws = Store.workoutsAll();
    if (!ws.length) return '<div class="panel"><div class="panel__body">' +
      U.empty('sword', 'Тренировок пока нет', 'Начни сессию — и здесь появится журнал с объёмом и калориями.') + '</div></div>';
    return '<div class="panel"><div class="panel__head"><h3>Журнал тренировок</h3><span class="grow"></span>' +
      '<span class="tag">' + ws.length + ' всего · ' + U.fmtNum(U.sum(ws.map(w => Store.volumeOf(w)))) + ' кг объёма</span></div>' +
      '<div class="panel__body panel__body--tight"><div class="list">' + ws.slice(0, 30).map(function (w) {
        const open = openHist[w.id];
        const d = U.parseISO(w.date);
        return '<div class="li" style="align-items:flex-start">' +
          '<div class="hist-day__d" style="width:40px"><b>' + d.getDate() + '</b><span>' + U.MONTHS_S[d.getMonth()].toUpperCase() + '</span></div>' +
          '<div class="li__b"><b>' + U.esc(w.name) + '</b>' +
            '<span>' + w.ex.length + ' упр. · ' + w.duration + ' мин · ' + U.fmtNum(Store.volumeOf(w)) + ' кг</span>' +
            (open ? '<div class="mt1" style="padding-left:2px">' + w.ex.map(e =>
              '<div class="t-xs t-dim">· ' + U.esc(e.name) + ': ' + (e.mode === 'time'
                ? e.sets.map(s2 => s2.time + 'с').join('/')
                : e.sets.map(s2 => U.round(s2.kg, 1) + '×' + s2.reps).join('/')) + '</div>').join('') + '</div>' : '') +
          '</div>' +
          '<div class="li__r"><b class="up">+' + Store.workoutKcalOf(w) + '</b><span>ккал</span></div>' +
          '<button class="iconbtn" data-thist="' + w.id + '" style="width:28px;height:28px"><i class="ico" data-ico="' + (open ? 'down' : 'pulse') + '" style="width:14px;height:14px"></i></button>' +
          '<button class="iconbtn" data-delw="' + w.id + '" style="width:28px;height:28px"><i class="ico" data-ico="trash" style="width:14px;height:14px"></i></button>' +
        '</div>';
      }).join('') + '</div></div></div>';
  }

  /* ── ЗАВЕРШИТЬ ТРЕНИРОВКУ ── */
  function finish() {
    if (!draft.ex.length) { UI.warn('Добавь хотя бы одно упражнение'); return; }
    const w = Store.logWorkout({
      date: date(), name: draft.name, planId: draft.planId, duration: U.num(draft.duration, 45),
      group: draft.group, ex: draft.ex, note: draft.note
    });
    /* сохраняем ПР автоматически */
    SFX.play('win');
    UI.ok('Тренировка записана', w.name + ' · ' + Store.workoutKcalOf(w) + ' ккал · +' + C.XP.workout + ' XP');
    draft = { name: '', planId: '', duration: 45, group: 'full', ex: [], note: '' };
    curDate = null;
    App.afterAction();
  }

  /* ── RENDER ── */
  function render(host) {
    /* инициализация черновика ДО сборки html: иначе первый экран
       показывает «Нет упражнений», хотя draft уже наполнен планом */
    if (!draft.ex.length && !draft.name) newDraft(Store.activePlan() || 'p_beginner_full');
    const s = Store.snapshot();
    const ws = Store.workoutsAll();
    const last7 = ws.filter(w => w.date >= U.addDays(U.today(), -6));
    const streakDays = {};

    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Тренировки</h1>' +
        '<p>Силовые и кардио. Считаем объём, калории и личные рекорды. Похудение = дефицит + силовые + шаги.</p>' +
      '</div><div class="row">' +
        '<button class="btn btn--ghost btn--sm" id="tDatePrev"><i class="ico" data-ico="down" style="transform:rotate(90deg)"></i></button>' +
        '<span class="tag t-hud">' + (curDate ? U.fmtDateFull(curDate) : 'сегодня') + '</span>' +
        '<button class="btn btn--ghost btn--sm" id="tDateNext"' + (curDate ? '' : ' disabled style="opacity:.3"') + '><i class="ico" data-ico="down" style="transform:rotate(-90deg)"></i></button>' +
      '</div></div>' +

      '<div class="grid g4 mb2">' +
        tile('⚔️', 'Тренировок всего', ws.length, '') +
        tile('🔥', 'За последние 7 дней', last7.length, 'дн. активности') +
        tile('🏋️', 'Общий объём', U.fmtNum(U.sum(ws.map(w => Store.volumeOf(w)))), 'кг') +
        tile('🔥', 'Сожжено', U.fmtNum(U.sum(ws.map(w => Store.workoutKcalOf(w)))), 'ккал тренировок') +
      '</div>' +

      sessionBlock(s) +
      '<div class="mt2">' + exList() + '</div>' +
      '<div class="row mt2"><button class="btn btn--ghost btn--sm" id="wAddEx2"><i class="ico" data-ico="plus"></i>Добавить упражнение</button>' +
        '<button class="btn btn--ghost btn--sm" id="wTimer">Таймер отдыха</button></div>' +

      '<div class="grid g-2-1 mt3">' +
        '<div class="stack">' + plansBlock() + historyBlock(s) + '</div>' +
        '<div class="stack">' + settingsBlock() + libraryBlock() + '</div>' +
      '</div>';
  }
  function tile(ic, lbl, val, sub) {
    return '<div class="tile" data-rv><div class="tile__ico" style="font-size:19px">' + ic + '</div>' +
      '<div class="tile__lbl">' + lbl + '</div><div class="tile__val">' + val + '</div>' +
      (sub ? '<div class="tile__sub">' + sub + '</div>' : '') + '</div>';
  }

  /* ── MOUNT ── */
  function mount(host) {
    const wp = U.$('#weekPlan', host);
    if (wp) wp.innerHTML = weekPlan();

    U.on(host, 'click', '[data-toggle]', function (e, h) {
      const id = h.getAttribute('data-toggle');
      openEx[id] = !openEx[id];
      App.refresh();
    });
    U.on(host, 'input', '.ex__body input[data-f]', function (e, i) {
      const exEl = i.closest('.ex');
      const id = exEl.getAttribute('data-ex');
      const e2 = draft.ex.find(x => x.id === id);
      if (!e2) return;
      const si = U.num(i.getAttribute('data-s'), 0);
      const f = i.getAttribute('data-f');
      e2.sets[si][f] = U.num(i.value, 0);
      const row = i.parentNode.querySelector('.x');
      if (row && f === 'kg') row.textContent = (U.num(e2.sets[si].kg, 0) * U.num(e2.sets[si].reps, 0)) + ' кг';
    });
    U.on(host, 'click', '[data-addset]', function (e, b) {
      const id = b.getAttribute('data-addset');
      const e2 = draft.ex.find(x => x.id === id);
      if (!e2) return;
      const last = e2.sets[e2.sets.length - 1] || { kg: 0, reps: 10, time: 45 };
      e2.sets.push({ kg: last.kg, reps: last.reps, time: e2.mode === 'time' ? (last.time || 45) : 0 });
      SFX.play('tick');
      App.refresh();
    });
    U.on(host, 'click', '[data-delset]', function (e, b) {
      const p = b.getAttribute('data-delset').split('|');
      const e2 = draft.ex.find(x => x.id === p[0]);
      if (!e2 || e2.sets.length <= 1) return;
      e2.sets.splice(U.num(p[1], 0), 1);
      SFX.play('del');
      App.refresh();
    });
    U.on(host, 'click', '[data-doneex]', function (e, b) {
      const id = b.getAttribute('data-doneex');
      const e2 = draft.ex.find(x => x.id === id);
      if (e2) e2.done = !e2.done;
      SFX.play(e2 && e2.done ? 'quest' : 'click');
      App.refresh();
    });
    U.on(host, 'click', '[data-rmex]', function (e, b) {
      e.stopPropagation();
      const id = b.getAttribute('data-rmex');
      const i = draft.ex.findIndex(x => x.id === id);
      if (i >= 0) { draft.ex.splice(i, 1); SFX.play('del'); App.refresh(); }
    });
    U.on(host, 'click', '[data-pr]', function (e, b) {
      const id = b.getAttribute('data-pr');
      const e2 = draft.ex.find(x => x.id === id);
      if (!e2) return;
      const best = U.max.apply(null, e2.sets.map(s => U.num(s.kg, 0)));
      if (!best) { UI.warn('Нет рабочего веса'); return; }
      UI.ok('ПР зафиксирован', e2.name + ' — ' + U.round(best, 1) + ' кг');
    });
    U.on(host, 'click', '#wFinish', finish);
    U.on(host, 'click', '#wDiscard', function () {
      UI.confirm({ title: 'ОЧИСТИТЬ ЧЕРНОВИК', text: 'Все подходы текущей тренировки будут потеряны.', ok: 'Очистить', danger: true })
        .then(function (yes) { if (yes) { newDraft(Store.activePlan() || 'p_beginner_full'); App.refresh(); } });
    });
    U.on(host, 'click', '#wAddEx, #wAddEx2', addExModal);
    U.on(host, 'click', '[data-plan]', function (e, b) {
      Store.setActivePlan(b.getAttribute('data-plan'));
      UI.ok('План выбран', '');
      App.afterAction();
    });
    U.on(host, 'click', '[data-planstart]', function (e, b) {
      newDraft(b.getAttribute('data-planstart'));
      SFX.play('add');
      UI.info('Тренировка начата', draft.name);
      App.refresh();
    });
    U.on(host, 'click', '#wTimer', function () {
      UI.modal({ title: 'ТАЙМЕР ОТДЫХА', html:
        '<div class="chips" id="tmPresets">' + [30, 45, 60, 90, 120].map(s => '<button class="chip" data-s="' + s + '">' + s + ' сек</button>').join('') + '</div>' +
        '<div class="field mt2"><label>Своё время, сек</label><input class="inp inp--num" id="tmV" type="number" value="60" min="5" max="600"></div>' +
        '<div class="modal__foot"><button class="btn btn--ghost btn--sm" data-close>Закрыть</button>' +
        '<button class="btn btn--sm" id="tmGo">Запустить</button></div>',
        onMount: function (b) {
          function go() { const s = U.num(U.$('#tmV', b).value, 60); UI.closeModal(); UI.timer(s); }
          U.on(U.$('#tmPresets', b), 'click', '.chip', function (e, c) { U.$('#tmV', b).value = c.getAttribute('data-s'); go(); });
          U.$('#tmGo', b).addEventListener('click', go);
        }
      });
    });
    U.on(host, 'click', '#tDatePrev', function () { curDate = U.addDays(curDate || U.today(), -1); App.refresh(); });
    U.on(host, 'click', '#tDateNext', function () { if (curDate) { curDate = U.addDays(curDate, 1); App.refresh(); } });
    U.on(host, 'click', '[data-thist]', function (e, b) {
      const id = b.getAttribute('data-thist');
      openHist[id] = !openHist[id];
      App.refresh();
    });
    U.on(host, 'click', '[data-delw]', function (e, b) {
      Store.delWorkout(b.getAttribute('data-delw')); SFX.play('del'); App.afterAction();
    });
    /* параметры сессии */
    U.on(host, 'input', '#sName', e => { draft.name = e.target.value; });
    U.on(host, 'input', '#sDur', e => { draft.duration = U.num(e.target.value, 45); });
    U.on(host, 'input', '#sNote', e => { draft.note = e.target.value; });
    U.on(host, 'change', '#sGroup', e => { draft.group = e.target.value; });
  }

  return { render, mount, reset: function () { curDate = null; draft = { name: '', planId: '', duration: 45, group: 'full', ex: [], note: '' }; } };
})();
