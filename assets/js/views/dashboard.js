/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/dashboard.js  ·  СТАТУС (окно системы)
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.dashboard = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;

  /* ── ОКНО СИСТЕМЫ ── */
  function statusWindow(s) {
    const w = s.weight, ma = s.ma, rate = s.rate;
    const sp = Chart.spark(ma.length > 2 ? ma.slice(-30) : s.series, 150, 34,
      rate !== null && rate > -0.05 ? '#ff3b62' : '#2f7bff');
    const left = s.target && w ? U.round(w - s.target, 1) : null;
    const dcls = s.series.length > 1 ? (w < s.series[s.series.length - 2] ? 'up' : w > s.series[s.series.length - 2] ? 'down' : 'flat') : 'flat';
    const dval = s.series.length > 1 ? U.round(w - s.series[s.series.length - 2], 1) : null;

    return '<div class="win" data-rv>' +
      '<i class="win__corner win__corner--tl"></i><i class="win__corner win__corner--tr"></i>' +
      '<i class="win__corner win__corner--bl"></i><i class="win__corner win__corner--br"></i>' +
      '<div class="win__top"><span class="win__tag">СТАТУС ОХОТНИКА</span>' +
      '<span class="win__live">СИСТЕМА АКТИВНА</span><span class="spacer"></span>' +
      '<span class="win__tag">' + U.fmtDate(s.today) + '</span></div>' +
      '<div class="win__body">' +
        '<div class="win__lvl"><b>' + s.level.level + '</b><i>LEVEL</i></div>' +
        '<div class="win__info">' +
          '<div class="row row--between" style="align-items:flex-start">' +
            '<div><div class="win__name">' + U.esc(s.profile.name || 'Охотник') + '</div>' +
            '<div class="win__rank">◆ ' + s.rank.name + ' · ' + s.rank.key + '</div></div>' +
            (sp || '') +
          '</div>' +
          '<div class="win__xp">' +
            '<div class="row row--between"><span>ОПЫТ ДО УРОВНЯ ' + (s.level.level + 1) + '</span>' +
            '<span><b>' + U.fmtNum(s.level.cur) + '</b> / ' + U.fmtNum(s.level.need) + ' XP</span></div>' +
            '<div class="xpbar"><i style="width:' + s.level.pct + '%"></i></div>' +
            (s.nextRank ? '<div class="row" style="margin-top:6px"><span>Следующий ранг: <b>' + s.nextRank.name + '</b> (ур. ' + s.nextRank.min + ')</span></div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="win__stats">' +
        stat('ТЕКУЩИЙ ВЕС', w ? U.fmtKg(w) : '—', 'кг', w ? '' : 'warn') +
        stat('ИЗМЕНЕНИЕ', dval === null ? '—' : U.signed(dval, 1, ' кг'), '', dcls === 'up' ? 'good' : dcls === 'down' ? 'bad' : '') +
        stat('ДО ЦЕЛИ', left !== null ? (left > 0 ? U.fmtKg(left) : '✓') : '—', left !== null ? 'кг' : '', left !== null && left <= 0 ? 'good' : 'hi') +
        stat('ТРЕНД / НЕДЕЛЯ', rate === null ? '—' : U.signed(rate, 2, ' кг'), '', rate === null ? '' : (rate <= -0.1 ? 'good' : rate >= 0.3 ? 'bad' : 'warn')) +
        stat('СЕРИЯ ДНЕЙ', s.streak, 'дн.', s.streak >= 7 ? 'good' : 'hi') +
        stat('Рекорд серии', s.bestStreak, 'дн.', '') +
        stat('ИМТ', s.bmi || '—', s.bmi ? '' : '', s.bmi ? (s.bmiCat.cls || '') : 'warn') +
        stat('ПРОГРЕСС ЦЕЛИ', Math.round(s.progress) + '%', '', 'hi') +
      '</div></div>';
  }
  function stat(lbl, val, unit, cls) {
    return '<div class="winstat ' + (cls ? 'winstat--' + cls : '') + '"><span>' + lbl + '</span>' +
      '<b>' + val + (unit ? '<em>' + unit + '</em>' : '') + '</b></div>';
  }

  /* ── КОЛЬЦА ДНЯ ── */
  function dayRings(s) {
    const t = s.totals, m = s.macros;
    const rings = UI.rings(184, [
      { v: Math.min(t.kcal, m.kcal), max: m.kcal, color: t.kcal > m.kcal ? '#ff3b62' : '#2f7bff' },
      { v: t.p, max: m.protein, color: '#ff8a3d' },
      { v: t.water, max: s.waterGoal, color: '#25e0f5' }
    ], { stroke: 14, gap: 8, center:
      '<b style="font-size:34px">' + s.score + '</b><span>СИЛА ДНЯ</span>' });

    return '<div class="g2" style="align-items:center">' +
      '<div style="display:grid;place-items:center">' + rings + '</div>' +
      '<div class="legend">' +
        lg('#2f7bff', t.kcal > m.kcal ? '#ff3b62' : '#2f7bff', 'Калории', t.kcal + ' / ' + m.kcal, 'ккал') +
        lg('#ff8a3d', '#ff8a3d', 'Белок', t.p + ' / ' + m.protein, 'г') +
        lg('#25e0f5', '#25e0f5', 'Вода', t.water + ' / ' + s.waterGoal, 'мл') +
        lg('#2ee6a8', '#2ee6a8', 'Тренировка', s.goals.workout ? 'выполнена' : 'нет', '') +
        '<div class="hr" style="margin:6px 0"></div>' +
        '<div class="legend__row"><span>Режим</span><b>' + (s.goal.mode === 'cut' ? 'Сушка' : s.goal.mode === 'bulk' ? 'Набор' : 'Поддержание') + '</b></div>' +
        '<div class="legend__row"><span>Цель в неделю</span><b>' + U.signed(-(s.goal.ratePerWeek || 0), 1, ' кг') + '</b></div>' +
      '</div></div>';
  }
  function lg(ic, col, name, val, unit) {
    return '<div class="legend__row"><i style="background:' + col + ';color:' + col + '"></i>' +
      '<span>' + name + '</span><b>' + val + ' <em class="t-mute" style="font-size:10px">' + unit + '</em></b></div>';
  }

  /* ── БЫСТРЫЕ ДЕЙСТВИЯ ── */
  function quick(s) {
    const t = s.totals;
    return '<div class="quick">' +
      qbtn('scale', 'Взвеситься', '+' + C.XP.weight, '#/weight') +
      qbtn('flame', 'Добавить еду', '+' + C.XP.meal, '#/nutrition') +
      qbtn('drop', 'Стакан воды', '+' + C.XP.water, '#/nutrition') +
      qbtn('sword', 'Тренировка', '+' + C.XP.workout, '#/training') +
      qbtn('ruler', 'Замеры', '+' + C.XP.measure, '#/weight') +
    '</div>';
  }
  function qbtn(ic, name, xp, href) {
    return '<a class="quick__b" href="' + href + '"><i class="ico" data-ico="' + ic + '"></i>' + name + '<em>' + xp + ' XP</em></a>';
  }

  /* ── КВЕСТЫ ── */
  function quests(s) {
    const qs = s.quests.slice(0, 5);
    return '<div class="list">' + qs.map(function (q) {
      const done = !!s.doneToday[q.id];
      const prog = Store.questProgress(q.metric, s.today);
      const need = q.target || 1;
      return '<div class="quest ' + (done ? 'is-done' : '') + '">' +
        '<button class="quest__box" data-quest="' + q.id + '">' + (done ? '<i class="ico" data-ico="check"></i>' : '<i class="ico" data-ico="plus"></i>') + '</button>' +
        '<div class="quest__b"><div class="quest__t">' + q.emoji + ' ' + U.esc(q.title) + '</div>' +
        (q.desc ? '<div class="quest__d">' + U.esc(q.desc) + '</div>' : '') +
        (need > 1 ? '<div class="bar mt1" style="width:120px"><i style="width:' + U.clamp(prog / need * 100, 0, 100) + '%"></i></div>' : '') +
        '</div>' +
        '<div class="quest__r"><span class="quest__xp">+' + q.xp + ' XP</span>' +
        (done ? '<span class="tag tag--green">готово</span>' : '') + '</div></div>';
    }).join('') + '</div>' +
      (s.quests.length > 5 ? '<a class="btn btn--ghost btn--sm btn--block mt2" href="#/quests">Все задания дня</a>' : '');
  }

  /* ── ПЛАН ПИТАНИЯ ── */
  function mealPlan(s) {
    return '<div class="mealplan">' + window.DB_FOOD.MEALS.map(function (m) {
      const b = s.totals.byMeal[m.id] || { kcal: 0, n: 0 };
      return '<div class="mealplan__row">' +
        '<span style="width:20px;color:var(--ac-lt)">' + m.icon + '</span>' +
        '<b>' + m.name + '</b>' +
        '<span class="t-xs t-mute">' + (b.n ? b.n + ' поз.' : 'пусто') + '</span>' +
        '<span>' + (b.kcal || 0) + ' ккал</span></div>';
    }).join('') + '</div>' +
    '<div class="hr"></div>' +
    '<div class="macro-bars">' +
      UI.macroBar('Белок', '🥩', '#ff8a3d', s.totals.p, s.macros.protein) +
      UI.macroBar('Жиры', '🥑', '#ffc542', s.totals.f, s.macros.fat) +
      UI.macroBar('Углеводы', '🍚', '#2f7bff', s.totals.c, s.macros.carbs) +
    '</div>';
  }

  /* ── АКТИВНОСТЬ / XP ── */
  function xpFeed(s) {
    const log = Store.state().xpLog.slice(-8).reverse();
    if (!log.length) return U.empty('pulse', 'Опыт ещё не получен', 'Выполните взвешивание, тренировку или квест — и здесь появится лента опыта.');
    return '<div class="list">' + log.map(function (l) {
      return '<div class="li"><div class="li__ico">' + (l.icon || '◆') + '</div>' +
        '<div class="li__b"><b>' + U.esc(l.reason) + '</b><span>' + U.agoLabel(l.date) + ' · ' + U.relTime(l.ts) + '</span></div>' +
        '<div class="li__r"><b class="up">+' + l.amount + '</b><span>XP</span></div></div>';
    }).join('') + '</div>';
  }

  /* ── ДОСТИЖЕНИЯ (последние) ── */
  function recentAch(s) {
    const got = Store.achList().filter(x => x.got).sort((a, b) => b.got && a.got ? 0 : 0);
    const items = got.slice(0, 4);
    if (!items.length) return U.empty('trophy', 'Достижений пока нет', 'Первые появятся после первых действий.');
    return '<div class="ach-grid">' + items.map(x =>
      '<div class="ach ach--got"><div class="ach__ic">' + x.a.icon + '</div><b>' + U.esc(x.a.name) + '</b><small>' + U.esc(x.a.desc) + '</small></div>'
    ).join('') + '</div>' + '<div class="row row--between mt2"><span class="t-xs t-mute">Открыто ' + s.achCount.got + ' из ' + s.achCount.all + '</span>' +
      '<a class="btn btn--ghost btn--xs" href="#/progress">Все достижения</a></div>';
  }

  /* ── КРАТКИЙ ОБЗОР СИСТЕМЫ ── */
  function briefing(s) {
    const m = s.macros, t = s.totals;
    const left = Math.max(0, m.kcal - t.kcal);
    const lines = [];
    lines.push('Осталось <b>' + U.fmtNum(left) + ' ккал</b> до дневной нормы. Белка нужно добрать <b>' + Math.max(0, Math.round(m.protein - t.p)) + ' г</b>.');
    if (!s.goals.weight) lines.push('Главное действие дня: <b>взвеситься утром натощак</b>. Это даёт +' + C.XP.weight + ' XP и корректный тренд.');
    if (!s.goals.workout) lines.push('Тренировки сегодня ещё не было. Даже 20 минут ходьбы засчитаны системой (+' + C.XP.workout + ' XP).');
    if (s.rate !== null && s.goal.mode === 'cut' && s.rate > -0.1) lines.push('Внимание: тренд веса почти нулевой. Проверь ккал и активность — либо добавь шаги.');
    if (s.progress >= 100) lines.push('Целевой вес достигнут. Дальше — поддержание или новая цель.');
    if (s.streak >= 3) lines.push('Серия <b>' + s.streak + ' ' + U.plural(s.streak, 'день', 'дня', 'дней') + '</b> подряд. Система это фиксирует.');
    return '<div class="brief"><h4>Ежедневная сводка</h4><p>' + lines[0] + '</p>' +
      (lines.length > 1 ? '<ul>' + lines.slice(1).map(l => '<li>' + l + '</li>').join('') + '</ul>' : '') + '</div>';
  }

  /* ── RENDER ── */
  function render(host) {
    const s = Store.snapshot();
    const bmiColor = s.bmiCat.cls === 'good' ? 'var(--green)' : s.bmiCat.cls === 'bad' ? 'var(--blood)' : s.bmiCat.cls === 'warn' ? 'var(--gold)' : 'var(--tx-dim)';
    const hr = s.healthy;

    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Статус охотника</h1>' +
        '<p>Система наблюдает за тобой. Каждое действие превращается в опыт, опыт — в ранг.</p>' +
      '</div><div class="row">' +
        '<span class="tag">' + U.fmtDateFull(s.today) + '</span>' +
        '<a class="btn btn--sm" href="#/weight"><i class="ico" data-ico="scale"></i>Взвеситься</a>' +
      '</div></div>' +

      '<div class="grid g-2-1">' +
        '<div class="stack">' +
          statusWindow(s) +
          '<div class="panel" data-rv><div class="panel__head"><h3>Кольца дня</h3><span class="grow"></span>' +
            '<span class="tag ' + (s.score >= 80 ? 'tag--green' : s.score >= 40 ? 'tag--gold' : 'tag--blood') + '">' + s.score + '% выполнено</span></div>' +
            '<div class="panel__body">' + dayRings(s) + '</div></div>' +
        '</div>' +
        '<div class="stack">' +
          '<div class="tile" data-rv><div class="tile__ico"><i class="ico" data-ico="brain"></i></div>' +
            '<div class="tile__lbl">Индекс массы тела</div>' +
            '<div class="tile__val" style="color:' + bmiColor + '">' + (s.bmi || '—') + '</div>' +
            '<div class="tile__sub">' + s.bmiCat.label + '</div>' +
            '<div class="mt2">' + UI.gaugeBar(0, C.bmiPos(s.bmi), { left: '15', right: '40' }) + '</div>' +
            '<div class="hr" style="margin:10px 0"></div>' +
            '<div class="t-xs t-mute">Здоровый вес для роста ' + s.profile.height + ' см:</div>' +
            '<b class="t-hud" style="font-size:14px">' + hr.min + '–' + hr.max + ' кг</b></div>' +
          '<div class="panel" data-rv><div class="panel__head"><h3>Прогресс цели</h3></div><div class="panel__body">' +
            '<div class="goal-path"><div class="goal-path__rail"><div class="goal-path__fill" style="width:' + s.progress + '%"></div>' +
            '<div class="goal-path__now" style="left:calc(' + s.progress + '% - 1.5px)"></div></div>' +
            '<div class="goal-path__ends"><b>' + s.start + ' кг</b><b>' + (s.target || '—') + ' кг</b></div></div>' +
            '<div class="stat-line mt2"><span>Потеряно</span><b class="' + (s.stats.totalLost > 0 ? 'up' : 'flat') + '">' + U.fmtKg(s.stats.totalLost, 1) + ' кг · ' + s.stats.lostPct + '%</b></div>' +
            '<div class="stat-line"><span>Осталось</span><b>' + (s.target && s.weight ? U.fmtKg(U.round(s.weight - s.target, 1)) + ' кг' : '—') + '</b></div>' +
            '<div class="stat-line"><span>Тренд</span><b class="' + (s.rate !== null && s.rate < 0 ? 'up' : 'flat') + '">' + (s.rate === null ? '—' : U.signed(s.rate, 2) + ' кг/нед') + '</b></div>' +
            '<div class="stat-line"><span>Прогноз цели</span><b>' + (s.eta ? U.fmtDate(s.eta) : '—') + '</b></div>' +
          '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="mt3" data-rv>' + quick(s) + '</div>' +

      '<div class="grid g-2-1 mt3">' +
        '<div class="stack">' +
          '<div class="panel"><div class="panel__head"><h3>Питание за сегодня</h3><span class="grow"></span>' +
            '<a class="btn btn--ghost btn--xs" href="#/nutrition">Открыть</a></div>' +
            '<div class="panel__body">' + mealPlan(s) + '</div></div>' +
          '<div class="panel"><div class="panel__head"><h3>Активность за 14 дней</h3><span class="grow"></span>' +
            '<span class="tag">ср. сила дня ' + Math.round(U.avg(lastScores(14))) + '%</span></div>' +
            '<div class="panel__body" id="dashChartWrap"></div></div>' +
        '</div>' +
        '<div class="stack">' +
          '<div class="panel"><div class="panel__head"><h3>Задания дня</h3></div><div class="panel__body panel__body--tight">' + quests(s) + '</div></div>' +
          '<div class="panel"><div class="panel__head"><h3>Достижения</h3></div><div class="panel__body panel__body--tight">' + recentAch(s) + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="grid g2 mt3">' +
        '<div class="panel" data-rv><div class="panel__head"><h3>Лента опыта</h3></div><div class="panel__body panel__body--tight">' + xpFeed(s) + '</div></div>' +
        '<div class="panel" data-rv><div class="panel__body">' + briefing(s) + '</div></div>' +
      '</div>';
  }
  function lastScores(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(Store.dayScore(U.addDays(U.today(), -i)));
    return out.length ? out : [0];
  }

  /* ── MOUNT ── */
  function mount(host) {
    const s = Store.snapshot();
    /* график активности */
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = U.addDays(s.today, -i);
      const t = Store.totals(d);
      days.push({ d: d, t: t, g: Store.dayGoals(d) });
    }
    const wrap = U.$('#dashChartWrap', host);
    if (wrap) {
      Chart.bars(wrap, {
        height: 176, goal: 0,
        data: days.map(function (x) {
          return {
            label: U.parseISO(x.d).getDate(),
            y: Math.round(x.g.workout ? 100 + x.t.kcal / 20 : x.t.kcal / 20),
            title: U.fmtDateFull(x.d),
            color: x.g.workout ? '#2ee6a8' : x.t.kcal ? '#2f7bff' : 'rgba(120,150,220,.25)',
            tip: [
              ['сила дня', Store.dayScore(x.d) + '%'],
              ['калории', x.t.kcal + ' ккал', '#2f7bff'],
              ['белок', Math.round(x.t.p) + ' г', '#ff8a3d'],
              ['тренировка', x.g.workout ? 'да' : 'нет', x.g.workout ? '#2ee6a8' : '#5f6d96']
            ]
          };
        })
      });
    }
    /* квесты */
    U.on(host, 'click', '[data-quest]', function (e, btn) {
      const id = btn.getAttribute('data-quest');
      /* квесты выполняются автоматически (Store.checkQuests) и сразу дают XP —
         повторный клик по выполненному ничего не отменяет, иначе XP начисляется дважды */
      if (Store.questDone(s.today, id)) {
        const dq = s.quests.find(x => x.id === id);
        UI.info('Уже выполнено', (dq ? dq.title : 'Квест') + ' — награда уже начислена.');
        return;
      }
      /* проверяем выполнимость авто-метрик */
      const q = s.quests.find(x => x.id === id);
      const need = q ? (q.target || 1) : 1;
      if (q && Store.questProgress(q.metric, s.today) < need) {
        UI.warn('Задание не выполнено', 'Отметить можно только реально выполненные действия.');
        return;
      }
      Store.completeQuest(s.today, id);
      SFX.play('quest');
      App.afterAction();
    });
  }

  return { render, mount };
})();
