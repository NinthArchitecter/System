/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/quests.js  ·  ЗАДАНИЯ
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.quests = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;

  const METRICS = [
    { k: 'weightLogged', n: 'Взвешивание', auto: true },
    { k: 'waterGoal',    n: 'Норма воды', auto: true },
    { k: 'workoutDone',  n: 'Тренировка', auto: true },
    { k: 'mealsAll',     n: 'Все приёмы пищи', auto: true },
    { k: 'kcalInGoal',   n: 'Калории в норме', auto: true },
    { k: 'proteinGoal',  n: 'Норма белка', auto: true },
    { k: 'stepsGoal',    n: '10 000 шагов', auto: true },
    { k: 'sleepOk',      n: 'Сон 8 часов', auto: true },
    { k: 'sugarOk',      n: 'Без сахара', auto: true },
    { k: 'measured',     n: 'Замеры тела', auto: true },
    { k: 'snackOk',      n: 'Без внеплановых перекусов', auto: true },
    { k: 'stretchDone',  n: 'Разминка / растяжка', auto: true },
    { k: 'calm',         n: 'Ручная отметка', auto: false }
  ];

  /* ── КАРТОЧКА ЗАДАНИЯ ── */
  function qCard(s, q) {
    const done = !!s.doneToday[q.id];
    const need = q.target || 1;
    const prog = U.clamp(Store.questProgress(q.metric, s.today), 0, Math.max(need, 1));
    const auto = METRICS.find(m => m.k === q.metric);
    return '<div class="quest ' + (done ? 'is-done' : '') + '" data-rv>' +
      '<button class="quest__box" data-q="' + q.id + '"><i class="ico" data-ico="' + (done ? 'check' : 'plus') + '"></i></button>' +
      '<div class="quest__b">' +
        '<div class="quest__t">' + (q.emoji || '◆') + ' ' + U.esc(q.title) +
          (q.custom ? ' <span class="tag tag--violet">своё</span>' : '') + '</div>' +
        (q.desc ? '<div class="quest__d">' + U.esc(q.desc) + '</div>' : '') +
        (need > 1 ? '<div class="bar mt1" style="max-width:150px"><i style="width:' + (prog / need * 100) + '%"></i></div>' : '') +
        (!done && auto ? '' : '<div class="quest__d mt1">' + (done ? '✓ выполнено и получено ' + q.xp + ' XP' : 'можно отметить вручную') + '</div>') +
      '</div>' +
      '<div class="quest__r">' +
        '<span class="quest__xp">+' + q.xp + ' XP</span>' +
        (q.custom ? '<button class="iconbtn" data-delq="' + q.id + '" style="width:26px;height:26px"><i class="ico" data-ico="trash" style="width:13px;height:13px"></i></button>' : '') +
      '</div></div>';
  }

  /* ── ЕЖЕДНЕВНАЯ СЕТКА ── */
  function weekGrid(s) {
    let out = '';
    for (let i = 6; i >= 0; i--) {
      const d = U.addDays(U.today(), -i);
      const q = Store.dayScore(d);
      const active = Store.dayActive(d);
      const cls = active ? 'is-done' : (d === U.today() ? 'is-today' : 'is-miss');
      out += '<div style="text-align:center">' +
        '<div class="week-dots" style="flex-direction:column;gap:4px">' +
          '<i class="' + cls + '" style="height:auto;padding:7px 0;font-size:9px;flex:none;width:100%">' + q + '%</i>' +
        '</div>' +
        '<div class="t-xs t-mute mt1">' + U.DOW[U.parseISO(d).getDay()] + '</div>' +
        '<div class="t-xs t-mute">' + U.parseISO(d).getDate() + '</div></div>';
    }
    return out;
  }

  /* ── СТАТЫ ── */
  function statsBlock(s) {
    const doneToday = Object.keys(s.doneToday).length;
    const total = s.quests.length;
    const allQ = Store.achCount;
    return '<div class="grid g4">' +
      '<div class="tile" data-rv><div class="tile__ico"><i class="ico" data-ico="scroll"></i></div>' +
        '<div class="tile__lbl">Заданий сегодня</div>' +
        '<div class="tile__val">' + doneToday + '<em>/ ' + total + '</em></div>' +
        '<div class="bar mt1"><i style="width:' + (total ? doneToday / total * 100 : 0) + '%"></i></div></div>' +
      '<div class="tile" data-rv><div class="tile__ico" style="color:var(--gold)"><i class="ico" data-ico="fire"></i></div>' +
        '<div class="tile__lbl">Текущая серия</div>' +
        '<div class="tile__val">' + s.streak + '<em>дн.</em></div>' +
        '<div class="tile__sub">рекорд ' + s.bestStreak + ' дн.</div></div>' +
      '<div class="tile" data-rv><div class="tile__ico" style="color:var(--green)"><i class="ico" data-ico="pulse"></i></div>' +
        '<div class="tile__lbl">Опыт за 7 дней</div>' +
        '<div class="tile__val">' + U.fmtNum(U.sum(Store.xpRange(7).map(x => x.amount))) + '</div>' +
        '<div class="tile__sub">в среднем ' + Math.round(U.sum(Store.xpRange(7).map(x => x.amount)) / 7) + ' XP/день</div></div>' +
      '<div class="tile" data-rv><div class="tile__ico" style="color:var(--gold)"><i class="ico" data-ico="trophy"></i></div>' +
        '<div class="tile__lbl">Достижения</div>' +
        '<div class="tile__val">' + allQ.got + '<em>/ ' + allQ.all + '</em></div>' +
        '<div class="bar mt1"><i style="width:' + (allQ.got / allQ.all * 100) + '%;background:linear-gradient(90deg,#a86b00,var(--gold))"></i></div></div>' +
      '</div>';
  }

  /* ── ПРОГРЕСС УРОВНЯ ── */
  function levelBlock(s) {
    const next = s.nextRank;
    return '<div class="panel"><div class="panel__head"><h3>Путь рангов</h3><span class="grow"></span>' +
      '<span class="tag">' + s.rank.name + '</span></div><div class="panel__body">' +
      '<div class="xpbar xpbar--gold" style="height:12px"><i style="width:' + s.level.pct + '%"></i></div>' +
      '<div class="row row--between t-xs t-mute mt1"><span>Уровень ' + s.level.level + ' · ' + U.fmtNum(s.level.cur) + ' XP</span>' +
      '<span>до ' + s.level.level + '‑го: ' + U.fmtNum(s.level.need) + ' XP</span></div>' +
      '<hr class="hr">' +
      '<div style="display:flex;flex-direction:column;gap:7px">' + C.RANKS.map(function (r) {
        const got = s.level.level >= r.min;
        const cur = s.rank.key === r.key;
        return '<div class="row" style="gap:10px;opacity:' + (got ? 1 : .42) + '">' +
          '<div style="width:26px;height:26px;display:grid;place-items:center;border-radius:7px;font-family:var(--f-hud);font-size:10px;font-weight:700;' +
          'background:' + (got ? 'linear-gradient(150deg,var(--ac),var(--ac-dk))' : 'rgba(255,255,255,.06)') + ';' +
          (got ? 'box-shadow:0 0 12px -3px var(--ac)' : '') + '">' + r.key + '</div>' +
          '<b style="flex:1;font-size:12.5px">' + r.name + '</b>' +
          '<span class="t-xs t-mute">с уровня ' + r.min + '</span>' +
          (cur ? '<span class="tag">вы здесь</span>' : '') + '</div>';
      }).join('') + '</div>' +
      (next ? '<p class="t-xs t-mute mt2">До ранга «' + next.name + '» нужно ' + U.fmtNum(C.xpTotal(next.min) - s.stats.totalXp) + ' XP. Это примерно ' +
        Math.max(1, Math.round((C.xpTotal(next.min) - s.stats.totalXp) / 180)) + ' ' + U.plural(Math.round((C.xpTotal(next.min) - s.stats.totalXp) / 180), 'день', 'дня', 'дней') + ' при 180 XP в день.</p>' : '') +
      '</div></div>';
  }

  /* ── МОДАЛКА НОВОГО ЗАДАНИЯ ── */
  function newQuestModal() {
    UI.modal({
      title: 'СОЗДАТЬ ЗАДАНИЕ',
      html:
        '<div class="field mb2"><label>Название</label><input class="inp" id="qName" placeholder="Например: 15 минут прогулки"></div>' +
        '<div class="field mb2"><label>Условие</label><select class="sel" id="qMetric">' +
          METRICS.map(m => '<option value="' + m.k + '">' + m.n + (m.auto ? ' (авто)' : '') + '</option>').join('') +
        '</select></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>Эмодзи</label><input class="inp" id="qEmoji" value="◆" maxlength="2"></div>' +
          '<div class="field"><label>Награда, XP</label><input class="inp inp--num" id="qXp" type="number" value="20" min="5" max="300"></div>' +
        '</div>' +
        '<p class="t-xs t-mute mt1">Задания с авто-условиями закрываются сами, когда данные в системе их выполняют. Ручные отмечаются нажатием.</p>' +
        '<div class="modal__foot"><button class="btn btn--ghost btn--sm" data-close>Отмена</button>' +
        '<button class="btn btn--sm" id="qOk">Создать</button></div>',
      onMount: function (b) {
        U.$('#qName', b).focus();
        U.$('#qOk', b).addEventListener('click', function () {
          const title = U.$('#qName', b).value.trim();
          if (!title) { UI.warn('Нужно название'); return; }
          Store.addCustomQuest({
            title: title, metric: U.$('#qMetric', b).value,
            xp: U.$('#qXp', b).value, emoji: U.$('#qEmoji', b).value || '◆'
          });
          UI.closeModal();
          UI.ok('Задание создано', title);
          App.afterAction();
        });
      }
    });
  }

  /* ── КАЛЕНДАРЬ ЗА 30 ДНЕЙ ── */
  function monthBlock() {
    let out = '';
    for (let i = 29; i >= 0; i--) {
      const d = U.addDays(U.today(), -i);
      const q = Store.dayScore(d);
      const quests = Store.dailyQuests(d);
      const done = Object.keys(Store.state().questDone[d] || {}).length;
      const col = q >= 80 ? 'var(--green)' : q >= 50 ? 'var(--ac)' : q >= 25 ? 'var(--gold)' : done ? 'rgba(120,150,220,.5)' : 'rgba(120,150,220,.18)';
      out += '<div style="flex:1;aspect-ratio:1;border-radius:6px;background:' + col + ';min-width:10px" title="' +
        U.fmtDate(d) + ': сила дня ' + q + '%, заданий ' + done + '/' + quests.length + '"></div>';
    }
    return '<div style="display:flex;flex-wrap:wrap;gap:3px">' + out + '</div>' +
      '<div class="row mt2" style="gap:10px;font-size:11px">' +
        '<span class="t-mute"><i style="display:inline-block;width:8px;height:8px;background:var(--green);border-radius:2px;margin-right:4px"></i>80%+</span>' +
        '<span class="t-mute"><i style="display:inline-block;width:8px;height:8px;background:var(--gold);border-radius:2px;margin-right:4px"></i>25–49%</span>' +
        '<span class="t-mute"><i style="display:inline-block;width:8px;height:8px;background:rgba(120,150,220,.3);border-radius:2px;margin-right:4px"></i>&lt;25%</span>' +
      '</div>';
  }

  /* ── RENDER ── */
  function render(host) {
    const s = Store.snapshot();
    const dq = s.quests;
    const custom = Store.state().customQuests;
    const doneToday = Object.keys(s.doneToday).length;
    const auto = dq.filter(q => !q.custom);
    const mine = dq.filter(q => q.custom);

    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Задания</h1>' +
        '<p>Система выдаёт задания каждый день. Выполнение даёт опыт, опыт — ранг. Задания с авто-условием закрываются сами.</p>' +
      '</div><div class="row">' +
        '<button class="btn btn--ghost btn--sm" id="qNew"><i class="ico" data-ico="plus"></i>Своё задание</button>' +
      '</div></div>' +

      statsBlock(s) +

      '<div class="grid g-2-1 mt3">' +
        '<div class="stack">' +
          '<div class="panel"><div class="panel__head"><h3>Задания на сегодня</h3><span class="grow"></span>' +
            '<span class="tag ' + (doneToday === dq.length ? 'tag--green' : '') + '">' + doneToday + ' / ' + dq.length + '</span></div>' +
            '<div class="panel__body">' +
              '<div class="quest-grid">' + auto.map(q => qCard(s, q)).join('') + '</div>' +
              (mine.length ? '<hr class="hr"><div class="lbl mb2">Свои задания</div><div class="quest-grid">' + mine.map(q => qCard(s, q)).join('') + '</div>' : '') +
            '</div></div>' +
          '<div class="panel"><div class="panel__head"><h3>Активность за 30 дней</h3></div>' +
            '<div class="panel__body">' + monthBlock() + '</div></div>' +
        '</div>' +
        '<div class="stack">' +
          '<div class="panel"><div class="panel__head"><h3>Неделя</h3></div><div class="panel__body">' +
            '<div style="display:flex;gap:6px">' + weekGrid(s) + '</div>' +
            '<hr class="hr">' +
            '<div class="stat-line"><span>Дней подряд</span><b class="up">' + s.streak + '</b></div>' +
            '<div class="stat-line"><span>Рекорд</span><b>' + s.bestStreak + '</b></div>' +
            '<div class="stat-line"><span>Идеальных дней</span><b>' + s.stats.perfectDays + '</b></div>' +
            '<div class="stat-line"><span>Опыт всего</span><b class="up">' + U.fmtNum(s.stats.totalXp) + ' XP</b></div>' +
          '</div></div>' +
          levelBlock(s) +
          '<div class="panel"><div class="panel__head"><h3>Бонусы серии</h3></div><div class="panel__body panel__body--tight"><div class="list">' +
            Object.keys(C.XP.streak).map(function (d) {
              const got = s.bestStreak >= U.num(d, 0);
              return '<div class="li"><div class="li__ico">' + (got ? '🔥' : '🔒') + '</div>' +
                '<div class="li__b"><b>' + d + ' дней подряд</b><span>' + (got ? 'получено' : 'впереди') + '</span></div>' +
                '<div class="li__r"><b class="' + (got ? 'up' : '') + '">+' + C.XP.streak[d] + '</b><span>XP</span></div></div>';
            }).join('') + '</div></div></div>' +
        '</div>' +
      '</div>';
  }

  /* ── MOUNT ── */
  function mount(host) {
    const s = Store.snapshot();
    U.on(host, 'click', '[data-q]', function (e, b) {
      const id = b.getAttribute('data-q');
      if (Store.questDone(U.today(), id)) { Store.uncompleteQuest(U.today(), id); SFX.play('del'); App.afterAction(); return; }
      const q = s.quests.find(x => x.id === id);
      if (!q) return;
      const need = q.target || 1;
      if (Store.questProgress(q.metric, U.today()) < need) {
        UI.warn('Условие не выполнено', 'Сначала выполни условие задания: ' + (q.desc || q.title));
        return;
      }
      Store.completeQuest(U.today(), id);
      SFX.play('quest');
      UI.xpAlert(q.xp, q.title);
      App.afterAction();
    });
    U.on(host, 'click', '#qNew', newQuestModal);
    U.on(host, 'click', '[data-delq]', function (e, b) {
      e.stopPropagation();
      Store.delCustomQuest(b.getAttribute('data-delq'));
      UI.ok('Задание удалено');
      App.afterAction();
    });
  }

  return { render, mount };
})();
