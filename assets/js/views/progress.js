/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/progress.js  ·  ПРОГРЕСС, СТАТИСТИКА, ДОСТИЖЕНИЯ
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.progress = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;
  let tab = 'body';
  let achFilter = 'all';

  /* ── СТАТИСТИКА ── */
  function statBlock(s) {
    const st = s.stats;
    return '<div class="grid g4">' +
      tile('⚖️', 'Вес сейчас', U.fmtKg(s.weight), s.stats.lostPct ? '−' + s.stats.lostPct + '% от старта' : 'нет данных') +
      tile('⬇️', 'Потеряно', U.fmtKg(st.totalLost, 1) + ' кг', 'от ' + (s.start || '—') + ' кг') +
      tile('💪', 'Объём за всё время', U.fmtNum(st.totalVolume) + ' кг', st.workouts + ' тренировок') +
      tile('🔥', 'Лучшая серия', st.bestStreak + ' дн.', 'сейчас ' + st.streak + ' дн.') +
      tile('🍽️', 'Записей в дневнике', st.mealsLogged, 'позиций еды') +
      tile('👣', 'Максимум шагов', U.fmtNum(st.bestSteps), 'за один день') +
      tile('💠', 'Идеальных дней', st.perfectDays, 'все цели дня') +
      tile('⭐', 'Всего опыта', U.fmtNum(st.totalXp), 'ранг ' + s.rank.name) +
      '</div>';
  }
  function tile(ic, lbl, val, sub) {
    return '<div class="tile" data-rv><div class="tile__ico" style="font-size:19px">' + ic + '</div>' +
      '<div class="tile__lbl">' + lbl + '</div><div class="tile__val" style="font-size:23px">' + val + '</div>' +
      '<div class="tile__sub">' + (sub || '') + '</div></div>';
  }

  /* ── ВКЛАДКА: ТЕЛО ── */
  function tabBody(s) {
    const body = Store.bodyAll();
    const w = Store.weightAll();
    const first = w.length ? w[0] : null, last = w.length ? w[w.length - 1] : null;
    const segs = [
      { v: U.round(stFatMass(s), 1), color: '#8b5cf6' },
      { v: U.round(leanMass(s), 1), color: '#2f7bff' }
    ];
    const pie = Chart.donut(segs, 176, 26);

    return '<div class="grid g-2-1">' +
      '<div class="panel"><div class="panel__head"><h3>Вес и среднее</h3><span class="grow"></span>' +
        '<span class="tag">средняя скорость ' + (s.rate === null ? '—' : U.signed(s.rate, 2) + ' кг/нед') + '</span></div>' +
        '<div class="panel__body"><div id="pWChart"></div></div></div>' +
      '<div class="panel"><div class="panel__head"><h3>Состав тела</h3></div><div class="panel__body">' +
        '<div style="position:relative;display:grid;place-items:center">' + pie +
          '<div style="position:absolute;text-align:center">' +
            '<b class="t-hud" style="font-size:26px">' + (s.weight ? U.fmtKg(s.weight) : '—') + '</b>' +
            '<div class="t-xs t-mute">общая масса, кг</div></div></div>' +
        '<div class="legend mt3">' +
          '<div class="legend__row"><i style="background:#8b5cf6;color:#8b5cf6"></i><span>Жировая масса</span><b>' + U.round(stFatMass(s), 1) + ' кг</b></div>' +
          '<div class="legend__row"><i style="background:#2f7bff;color:#2f7bff"></i><span>Мышечная масса</span><b>' + U.round(leanMass(s), 1) + ' кг</b></div>' +
          '<div class="legend__row"><i style="background:#ff8a3d;color:#ff8a3d"></i><span>Доля жира (оценка по ИМТ)</span><b>' + (estFat(s) ? estFat(s) + '%' : '—') + '</b></div>' +
        '</div>' +
        '<hr class="hr">' +
        '<div class="stat-line"><span>Вес жира</span><b class="up">' + (first && last ? U.signed(U.round(stFatMass(s) - stFatMassAt(first.kg, s), 1), 1, ' кг') : '—') + '</b></div>' +
        '<div class="stat-line"><span>Мышечная масса</span><b>' + (first && last ? U.signed(U.round(stLeanMassAt(last.kg, s) - stLeanMassAt(first.kg, s), 1), 1, ' кг') : '—') + '</b></div>' +
      '</div></div>' +
      '<div class="panel mt3"><div class="panel__head"><h3>Обхваты</h3><span class="grow"></span>' +
        (body.length ? '<span class="tag">' + body.length + ' замеров</span>' : '') + '</div>' +
        '<div class="panel__body">' +
        (body.length >= 2 ? '<div id="pBChart"></div>' : U.empty('ruler', 'Нужно минимум два замера', 'Добавь обхваты во вкладке «Вес» — здесь появится сравнение по всем точкам.')) +
        '</div></div>';
  }
  /* Оценка состава по формулам Deurenberg (ИМТ) — честная помечена как оценка */
  function estFat(s) {
    if (!s.weight || !s.profile.height) return null;
    return U.round(1.2 * s.bmi + 0.23 * C.age(s.profile) - 10.8 * (s.profile.sex === 'female' ? 0 : 1) - 5.4, 1);
  }
  function stFatMass(s) { const f = estFat(s); return f ? s.weight * f / 100 : 0; }
  function leanMass(s) { return Math.max(0, (s.weight || 0) - stFatMass(s)); }
  function stFatMassAt(kg, s) {
    const m = C.bmi(kg, s.profile.height);
    const f = 1.2 * m + 0.23 * C.age(s.profile) - 10.8 * (s.profile.sex === 'female' ? 0 : 1) - 5.4;
    return kg * f / 100;
  }
  function stLeanMassAt(kg, s) { return Math.max(0, kg - stFatMassAt(kg, s)); }

  /* ── ВКЛАДКА: ПИТАНИЕ ── */
  function tabFood(s) {
    const n = 28, days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = U.addDays(s.today, -i);
      days.push({ d: d, t: Store.totals(d) });
    }
    const logged = days.filter(x => x.t.items > 0);
    const avgKcal = U.avg(logged.map(x => x.t.kcal)) || 0;
    const avgP = U.avg(logged.map(x => x.t.p)) || 0;
    const avgF = U.avg(logged.map(x => x.t.f)) || 0;
    const avgC = U.avg(logged.map(x => x.t.c)) || 0;
    const m = s.macros;
    const macroSegs = [
      { v: U.round(avgP * 4), color: '#ff8a3d' },
      { v: U.round(avgF * 9), color: '#ffc542' },
      { v: U.round(avgC * 4), color: '#2f7bff' }
    ];

    return '<div class="grid g-2-1">' +
      '<div class="panel"><div class="panel__head"><h3>Калории и белок</h3><span class="grow"></span>' +
        '<span class="tag">норма ' + m.kcal + ' ккал</span></div>' +
        '<div class="panel__body"><div id="pKChart"></div></div></div>' +
      '<div class="panel"><div class="panel__head"><h3>Средние макросы</h3></div><div class="panel__body">' +
        '<div style="position:relative;display:grid;place-items:center">' + Chart.donut(macroSegs, 160, 24) +
          '<div style="position:absolute;text-align:center"><b class="t-hud" style="font-size:22px">' + Math.round(avgKcal) + '</b>' +
          '<div class="t-xs t-mute">ккал / день</div></div></div>' +
        '<div class="legend mt3">' +
          '<div class="legend__row"><i style="background:#ff8a3d;color:#ff8a3d"></i><span>Белок</span><b>' + Math.round(avgP) + ' / ' + m.protein + ' г</b></div>' +
          '<div class="legend__row"><i style="background:#ffc542;color:#ffc542"></i><span>Жиры</span><b>' + Math.round(avgF) + ' / ' + m.fat + ' г</b></div>' +
          '<div class="legend__row"><i style="background:#2f7bff;color:#2f7bff"></i><span>Углеводы</span><b>' + Math.round(avgC) + ' / ' + m.carbs + ' г</b></div>' +
        '</div>' +
        '<hr class="hr">' +
        '<div class="stat-line"><span>Дней с записью</span><b>' + logged.length + ' из ' + n + '</b></div>' +
        '<div class="stat-line"><span>Дней в калоре</span><b class="' + (s.stats.kcalDays > n / 2 ? 'up' : '') + '">' + s.stats.kcalDays + '</b></div>' +
        '<div class="stat-line"><span>Дней с нормой белка</span><b class="up">' + s.stats.proteinDays + '</b></div>' +
        '<div class="stat-line"><span>Дней с нормой воды</span><b>' + s.stats.waterDays + '</b></div>' +
      '</div></div>' +
      '<div class="panel mt3"><div class="panel__head"><h3>Топ блюд</h3><span class="grow"></span>' +
        '<span class="tag">по калорийности</span></div><div class="panel__body panel__body--tight">' + topFoods() + '</div></div>' +
      '</div>';
  }
  function topFoods() {
    const map = {};
    Object.keys(Store.state().meals).forEach(function (d) {
      (Store.state().meals[d].items || []).forEach(function (i) {
        const k = i.name;
        if (!map[k]) map[k] = { n: 0, kcal: 0 };
        map[k].n++; map[k].kcal += i.kcal;
      });
    });
    const arr = Object.keys(map).map(k => ({ name: k, n: map[k].n, kcal: map[k].kcal })).sort((a, b) => b.kcal - a.kcal).slice(0, 10);
    if (!arr.length) return U.empty('flame', 'Дневник пуст', '');
    return '<div class="list">' + arr.map(function (a) {
      return '<div class="li"><div class="li__ico">🍽️</div>' +
        '<div class="li__b"><b>' + U.esc(a.name) + '</b><span>' + a.n + ' ' + U.plural(a.n, 'раз', 'раза', 'раз') + '</span></div>' +
        '<div class="li__r"><b>' + U.fmtNum(a.kcal) + '</b><span>ккал</span></div></div>';
    }).join('') + '</div>';
  }

  /* ── ВКЛАДКА: ТРЕНИРОВКИ ── */
  function tabTrain(s) {
    const ws = Store.workoutsAll();
    const byGroup = {};
    let totalMin = 0, totalKcal = 0;
    ws.forEach(function (w) {
      totalMin += w.duration; totalKcal += Store.workoutKcalOf(w);
      (w.ex || []).forEach(function (e) {
        const g = window.DB_EX.exGroup(e.id);
        if (!byGroup[g]) byGroup[g] = { n: 0, vol: 0 };
        byGroup[g].n++;
        (e.sets || []).forEach(function (st) { byGroup[g].vol += U.num(st.kg, 0) * U.num(st.reps, 0); });
      });
    });
    const gArr = Object.keys(byGroup).map(k => ({ g: k, n: byGroup[k].n, vol: Math.round(byGroup[k].vol) }))
      .sort((a, b) => b.n - a.n);
    const maxVol = U.max.apply(null, gArr.map(x => x.vol).concat([1]));

    /* объём по месяцам */
    const months = {};
    ws.forEach(function (w) {
      const k = U.monthKey(w.date);
      months[k] = (months[k] || 0) + Store.volumeOf(w);
    });
    const mKeys = Object.keys(months).sort();
    const recent = ws.filter(w => w.date >= U.addDays(U.today(), -6));

    return '<div class="grid g4">' +
      tile('⚔️', 'Тренировок', ws.length, 'всего в системе') +
      tile('⏱️', 'Часов', Math.round(totalMin / 60), U.dur(totalMin)) +
      tile('🔥', 'Сожжено', U.fmtNum(totalKcal), 'ккал по тренировкам') +
      tile('🏋️', 'Объём', U.fmtNum(U.sum(ws.map(w => Store.volumeOf(w)))) + ' кг', 'сумма вес×повторы') +
      '</div>' +
      '<div class="grid g-2-1 mt3">' +
        '<div class="panel"><div class="panel__head"><h3>Объём по месяцам</h3></div>' +
          '<div class="panel__body">' + (mKeys.length ? '<div id="pMChart"></div>' : U.empty('chart', 'Нет данных', 'Начни тренировки — объём появится здесь.')) + '</div></div>' +
        '<div class="panel"><div class="panel__head"><h3>Группы мышц</h3></div><div class="panel__body">' +
          (gArr.length ? '<div class="bar-compare">' + gArr.map(function (x) {
            return '<div class="bc"><b>' + (window.DB_EX.M[x.g] || x.g) + '</b>' +
              '<div class="bar"><i style="width:' + (x.vol / maxVol * 100) + '%"></i></div>' +
              '<span class="val">' + U.fmtNum(x.vol) + ' кг</span></div>';
          }).join('') + '</div>' : U.empty('sword', 'Нет упражнений в журнале', '')) +
        '</div></div>' +
      '</div>' +
      '<div class="panel mt3"><div class="panel__head"><h3>Последние 7 дней</h3></div><div class="panel__body">' +
        '<div style="display:flex;gap:7px">' + last7strip() + '</div></div></div>';
  }
  function last7strip() {
    let out = '';
    for (let i = 6; i >= 0; i--) {
      const d = U.addDays(U.today(), -i);
      const list = Store.state().workouts.filter(w => w.date === d);
      out += '<div style="flex:1;border:1px solid var(--line);border-radius:11px;padding:11px;min-height:96px;' +
        (d === U.today() ? 'border-color:var(--ac);background:rgba(90,140,255,.08)' : '') + '">' +
        '<div class="t-xs t-mute">' + U.DOW[U.parseISO(d).getDay()] + ', ' + U.parseISO(d).getDate() + '</div>' +
        (list.length ? list.map(w => '<div class="mt1"><b class="t-xs">' + U.esc(w.name.slice(0, 16)) + '</b>' +
          '<div class="t-xs t-mute">' + w.duration + ' мин · ' + U.fmtNum(Store.volumeOf(w)) + ' кг</div></div>').join('')
          : '<div class="t-xs t-mute" style="margin-top:16px">отдых</div>') +
        '</div>';
    }
    return out;
  }

  /* ── ВКЛАДКА: ДОСТИЖЕНИЯ ── */
  function tabAch(s) {
    const all = Store.achList();
    const got = all.filter(x => x.got), locked = all.filter(x => !x.got);
    const f = achFilter;
    const list = f === 'got' ? got : f === 'locked' ? locked : all;
    const GROUPS = { solo:'⏳ одиночка', streak:'🔥 дисциплина', progress:'⬇️ прогресс', train:'⚔️ тренировки', food:'🍽️ питание', level:'⭐ уровни' };
    const groupOf = function (id) {
      if (id.indexOf('streak') >= 0 || id === 'a_days_50') return 'streak';
      if (id.indexOf('loss') >= 0 || id === 'a_goal' || id === 'a_bmi') return 'progress';
      if (id.indexOf('workout') >= 0 || id.indexOf('volume') >= 0 || id === 'a_steps_day') return 'train';
      if (id.indexOf('meal') >= 0 || id.indexOf('protein') >= 0 || id.indexOf('kcal') >= 0 || id.indexOf('water') >= 0) return 'food';
      if (id.indexOf('lvl') >= 0 || id.indexOf('xp') >= 0 || id.indexOf('perfect') >= 0) return 'level';
      return 'solo';
    };
    const byGroup = {};
    all.forEach(x => { const g = groupOf(x.a.id); (byGroup[g] = byGroup[g] || []).push(x); });

    return '<div class="row mb2" style="gap:8px">' +
      '<div class="seg" id="achF">' +
        '<button data-f="all" class="' + (f === 'all' ? 'is-on' : '') + '">Все ' + all.length + '</button>' +
        '<button data-f="got" class="' + (f === 'got' ? 'is-on' : '') + '">Открыто ' + got.length + '</button>' +
        '<button data-f="locked" class="' + (f === 'locked' ? 'is-on' : '') + '">Закрыто ' + locked.length + '</button>' +
      '</div></div>' +
      (f === 'all'
        ? Object.keys(GROUPS).map(g => (byGroup[g] ? section(GROUPS[g], byGroup[g]) : '')).join('')
        : section(f === 'got' ? 'Открытые достижения' : 'Ещё не открыты', list));
  }
  function section(title, list) {
    return '<div class="mb2"><div class="lbl mb2">' + title + ' · ' + list.filter(x => x.got).length + '/' + list.length + '</div>' +
      '<div class="ach-grid">' + list.map(function (x) {
        return '<div class="ach ' + (x.got ? 'ach--got' : 'ach--locked') + '">' +
          '<div class="ach__ic">' + (x.got ? x.a.icon : '🔒') + '</div>' +
          '<b>' + U.esc(x.a.name) + '</b><small>' + U.esc(x.a.desc) + '</small>' +
          (x.got ? '<small class="up" style="margin-top:5px">' + x.got + '</small>' : '') + '</div>';
      }).join('') + '</div></div>';
  }

  /* ── ВКЛАДКА: ОПЫТ ── */
  function tabXp(s) {
    const log = Store.state().xpLog.slice().reverse();
    const byReason = {};
    log.forEach(function (l) {
      const k = l.reason || l.icon;
      if (!byReason[k]) byReason[k] = { xp: 0, n: 0, icon: l.icon };
      byReason[k].xp += l.amount; byReason[k].n++;
    });
    const arr = Object.keys(byReason).map(k => ({ name: k, xp: byReason[k].xp, n: byReason[k].n, icon: byReason[k].icon }))
      .sort((a, b) => b.xp - a.xp).slice(0, 12);
    const maxXp = U.max.apply(null, arr.map(x => x.xp).concat([1]));
    const weekly = [];
    for (let i = 7; i >= 0; i--) {
      const d = U.addDays(U.today(), -i);
      weekly.push({ d: d, xp: Store.xpOn(d) });
    }
    return '<div class="grid g-2-1">' +
      '<div class="panel"><div class="panel__head"><h3>Опыт по неделям</h3><span class="grow"></span>' +
        '<span class="tag">всего ' + U.fmtNum(s.stats.totalXp) + ' XP</span></div>' +
        '<div class="panel__body"><div id="pXChart"></div></div></div>' +
      '<div class="panel"><div class="panel__head"><h3>Источники опыта</h3></div><div class="panel__body">' +
        '<div class="bar-compare">' + arr.map(function (a) {
          return '<div class="bc"><b title="' + U.esc(a.name) + '">' + a.icon + ' ' + U.esc(a.name.slice(0, 11)) + '</b>' +
            '<div class="bar bar--gold"><i style="width:' + (a.xp / maxXp * 100) + '%;background:linear-gradient(90deg,#a86b00,var(--gold))"></i></div>' +
            '<span class="val">' + U.fmtNum(a.xp) + '</span></div>';
        }).join('') + '</div></div></div>' +
      '<div class="panel mt3"><div class="panel__head"><h3>Лента опыта</h3><span class="grow"></span>' +
        '<button class="btn btn--ghost btn--xs" id="clearXp">Очистить ленту</button></div>' +
        '<div class="panel__body panel__body--tight"><div class="list" style="max-height:420px;overflow-y:auto">' +
        (log.length ? log.slice(0, 120).map(function (l) {
          return '<div class="li"><div class="li__ico">' + (l.icon || '◆') + '</div>' +
            '<div class="li__b"><b>' + U.esc(l.reason) + '</b><span>' + U.fmtDateShort(l.date) + ' · ' + U.relTime(l.ts) + '</span></div>' +
            '<div class="li__r"><b class="up">+' + l.amount + '</b><span>XP</span></div></div>';
        }).join('') : U.empty('pulse', 'Лента пуста', '')) + '</div></div></div></div>';
  }

  /* ── RENDER ── */
  function render(host) {
    const s = Store.snapshot();
    const TABS = [
      { k: 'body', n: 'Тело' }, { k: 'food', n: 'Питание' },
      { k: 'train', n: 'Тренировки' }, { k: 'ach', n: 'Достижения' }, { k: 'xp', n: 'Опыт' }
    ];
    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Прогресс</h1>' +
        '<p>Полная картина: тело, питание, тренировки, достижения и лента опыта. Данные считаются из всех твоих записей.</p>' +
      '</div><div class="row"><div class="seg" id="pTabs">' +
        TABS.map(t => '<button data-t="' + t.k + '" class="' + (t === tab ? 'is-on' : '') + '">' + t.n + '</button>').join('') +
      '</div></div></div>' +
      statBlock(s) +
      '<div class="mt3" id="pBody">' + tabHtml(s) + '</div>';
  }
  function tabHtml(s) {
    if (tab === 'body') return tabBody(s);
    if (tab === 'food') return tabFood(s);
    if (tab === 'train') return tabTrain(s);
    if (tab === 'ach') return tabAch(s);
    return tabXp(s);
  }

  /* ── MOUNT ── */
  function mount(host) {
    const s = Store.snapshot();
    const draw = function () {
      if (tab === 'body') {
        const w = Store.weightAll(), ma = Store.maSeries(7);
        const c = U.$('#pWChart', host);
        if (c && w.length) {
          Chart.line(c, { data: w.map(function (x, i) {
            return { y: x.kg, label: U.parseISO(x.date).getDate(), title: U.fmtDateFull(x.date),
              tip: [['вес', U.fmtKg(x.kg) + ' кг', '#2f7bff'],
                    ['среднее 7д', ma[i] ? U.fmtKg(ma[i]) + ' кг' : '—', '#25e0f5'],
                    ['из старта', U.signed(U.round(x.kg - (s.start || x.kg), 1), 1, ' кг'), x.kg <= (s.start || x.kg) ? '#2ee6a8' : '#ff3b62']] };
          }), height: 250, color: '#2f7bff', area: true, unit: ' кг',
            goal: s.target ? { v: s.target, label: 'цель ' + s.target + ' кг' } : null,
            bands: s.healthy.max ? [{ from: s.healthy.min, to: s.healthy.max }] : null });
        }
        const bc = U.$('#pBChart', host);
        if (bc) {
          const body = Store.bodyAll();
          const f = body[0], l = body[body.length - 1];
          const keys = Store.BODY_FIELDS.filter(k => f[k.k] !== undefined && l[k.k] !== undefined);
          Chart.bars(bc, { height: 200, data: keys.map(k => ({
            label: k.n, y: l[k.k], title: k.n, color: l[k.k] < f[k.k] ? '#2ee6a8' : '#ff3b62',
            tip: [['в начале', U.round(f[k.k], 1) + ' см', '#93a2cc'], ['сейчас', U.round(l[k.k], 1) + ' см', '#2f7bff'],
                  ['изменение', U.signed(U.round(l[k.k] - f[k.k], 1), 1, ' см'), l[k.k] < f[k.k] ? '#2ee6a8' : '#ff3b62']]
          })) });
        }
      }
      if (tab === 'food') {
        const c = U.$('#pKChart', host);
        if (c) {
          const days = [];
          for (let i = 27; i >= 0; i--) {
            const d = U.addDays(s.today, -i), t = Store.totals(d);
            days.push({ label: U.parseISO(d).getDate(), y: t.kcal, title: U.fmtDateFull(d),
              color: t.kcal === 0 ? 'rgba(120,150,220,.2)' : t.kcal > s.macros.kcal ? '#ff3b62' : '#2f7bff',
              tip: [['калории', t.kcal + ' ккал', '#2f7bff'], ['белок', Math.round(t.p) + ' г', '#ff8a3d'],
                    ['норма', s.macros.kcal + ' ккал', '#ffc542']] });
          }
          Chart.bars(c, { height: 230, goal: s.macros.kcal, data: days });
        }
      }
      if (tab === 'train') {
        const c = U.$('#pMChart', host);
        if (c) {
          const months = {};
          Store.workoutsAll().forEach(w => { months[U.monthKey(w.date)] = (months[U.monthKey(w.date)] || 0) + Store.volumeOf(w); });
          const keys = Object.keys(months).sort();
          Chart.bars(c, { height: 210, color: '#25e0f5', data: keys.map(k => ({
            label: U.monthLabel(k), y: months[k], title: U.monthLabel(k), color: '#25e0f5',
            tip: [['объём', U.fmtNum(months[k]) + ' кг', '#25e0f5']]
          })) });
        }
      }
      if (tab === 'xp') {
        const c = U.$('#pXChart', host);
        if (c) {
          const days = [];
          for (let i = 7; i >= 0; i--) {
            const d = U.addDays(s.today, -i), xp = Store.xpOn(d);
            days.push({ label: U.DOW[U.parseISO(d).getDay()], y: xp, title: U.fmtDateFull(d),
              color: xp > 0 ? '#ffc542' : 'rgba(120,150,220,.2)',
              tip: [['опыт', xp + ' XP', '#ffc542'], ['заданий', Object.keys(Store.state().questDone[d] || {}).length, '#93a2cc']] });
          }
          Chart.bars(c, { height: 220, color: '#ffc542', data: days });
        }
      }
    };
    draw();

    U.on(host, 'click', '#pTabs button', function (e, b) {
      tab = b.getAttribute('data-t');
      SFX.play('click');
      App.refresh();
    });
    U.on(host, 'click', '#achF button', function (e, b) {
      achFilter = b.getAttribute('data-f');
      App.refresh();
    });
    U.on(host, 'click', '#clearXp', function () {
      UI.confirm({ title: 'ОЧИСТИТЬ ЛЕНТУ ОПЫТА', text: 'Всего опыта и уровня это не уменьшит — пропадёт только история записей.', ok: 'Очистить' })
        .then(function (yes) {
          if (!yes) return;
          Store.state().xpLog = [];
          Store.commit('Лента опыта очищена');
          App.afterAction();
        });
    });
  }

  return { render, mount };
})();
