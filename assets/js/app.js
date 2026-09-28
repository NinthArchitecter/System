/* ═══════════════════════════════════════════════════════════════
   SYSTEM — app.js  ·  маршрутизация, HUD, онбординг, горячие клавиши
   ═══════════════════════════════════════════════════════════════ */
window.App = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;

  const ROUTES = ['dashboard', 'weight', 'nutrition', 'training', 'quests', 'progress', 'settings'];
  let current = 'dashboard';
  let lastActionAt = 0;
  let shellWired = false;
  let hashWired = false;

  /* ═══ 1. ЗАПУСК ═══ */
  function boot(first) {
    Store.load();
    const st = Store.state();
    document.documentElement.setAttribute('data-theme', st.settings.theme || 'azure');
    SFX.setOn(!!st.settings.sound);
    applyParticles();
    FX.init();
    wireShell();

    if (!st.settings.onboarded) { $('#shell').hidden = true; showOnboarding(); return; }
    startApp();
  }
  function bootHard() { boot(); }

  function startApp() {
    $('#shell').hidden = false;
    const st = Store.state();
    /* фон: гейт нового дня — проверяем квесты, серию, достижения */
    rollover();
    if (!hashWired) { window.addEventListener('hashchange', route); hashWired = true; }
    route();
    /* если hash пуст */
    if (!location.hash) location.hash = '#/dashboard';
    updateHud();
    if (!App._timers) {
      App._timers = true;
      setInterval(tick, 1000);
      setInterval(checkReminders, 30000);
      Store.subscribe(function () { updateHud(); });
    }
    /* первый запуск: приветствие */
    if (st.meta.lastSeenDate !== U.today()) {
      st.meta.lastSeenDate = U.today();
      Store.save();
      setTimeout(function () {
        UI.alert({ kind: 'info', tag: 'ДОБРОЕ УТРО, ' + (st.profile.name || 'ОХОТНИК').toUpperCase(), life: 6500,
          title: 'Система активна, ' + U.fmtDateFull(U.today()),
          text: 'Твои задания на сегодня уже сформированы. Начни с взвешивания — это база всех расчётов.' });
      }, 700);
    }
  }

  /* ═══ 2. ПЕРЕХОД НА НОВЫЙ ДЕНЬ ═══ */
  function rollover() {
    const st = Store.state();
    Store.ensureStart();
    /* автозакрытие вчерашних авто-квестов, если они выполнены */
    const y = U.addDays(U.today(), -1);
    Store.checkQuests(y);
    Store.checkQuests(U.today());
    Store.checkStreakReward();
    Store.checkAllAchievements();
    Store.checkDayComplete(U.today());
    Store.commit('Новый день');
    const b = Store.takeBatch();
    flushBatch(b);
  }
  function flushBatch(b) {
    if (b.ach && b.ach.length) UI.achAlert(b.ach);
    if (b.levels && b.levels.length) UI.levelUpAlert(b.levels);
  }

  /* ═══ 3. МАРШРУТИЗАЦИЯ ═══ */
  function route() {
    const hash = (location.hash || '#/dashboard').replace(/^#\/?/, '').split('?')[0];
    const name = ROUTES.indexOf(hash) >= 0 ? hash : 'dashboard';
    /* сброс внутреннего состояния раздела, из которого ушли */
    if (name !== current && Views[current] && typeof Views[current].reset === 'function') {
      try { Views[current].reset(); } catch (e) { /* не критично */ }
    }
    current = name;
    /* активные пункты меню */
    $$('[data-view]').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-view') === name);
    });
    let host = $('#view');
    /* свежий узел на каждый рендер — иначе делегированные слушатели
       из mount() накапливаются при каждом переходе между разделами */
    if (host) {
      const fresh = document.createElement('main');
      fresh.id = 'view';
      fresh.className = host.className;
      fresh.tabIndex = -1;
      host.replaceWith(fresh);
      host = fresh;
    } else {
      host = document.createElement('main');
      host.id = 'view';
      document.querySelector('.main').appendChild(host);
    }
    const v = Views[name];
    if (!v) { host.innerHTML = U.empty('close', 'Раздел не найден', ''); return; }
    try {
      v.render(host);
      v.mount(host);
      U.revealStagger(host);
    } catch (e) {
      console.error('SYSTEM: ошибка отрисовки «' + name + '»', e);
      host.innerHTML = '<div class="panel"><div class="panel__body">' +
        U.empty('close', 'Ошибка в разделе', String(e && e.message || e)) +
        '<div class="t-center mt2"><button class="btn btn--sm" onclick="location.reload()">Перезагрузить</button></div>' +
        '</div></div>';
    }
    host.scrollTop = 0;
    U.scrollToY(0);
    updateHud();
    const side = $('.side');
    if (side) side.classList.remove('is-open');
  }
  function refresh() { route(); }

  /* ═══ 4. HUD ═══ */
  function updateHud() {
    const s = Store.snapshot();
    $('#hudKcal').textContent = U.fmtNum(s.totals.kcal);
    $('#hudKcalGoal').textContent = U.fmtNum(s.kcalGoal);
    $('#hudWater').textContent = s.totals.water;
    $('#hudWaterGoal').textContent = s.waterGoal;
    $('#hudStreak').textContent = s.streak;
    $('#hudWeight').textContent = s.weight ? U.fmtKg(s.weight) : '—';
    $('#hudWeightGoal').textContent = s.target ? '→ ' + s.target + ' кг' : 'кг';
    $('#hudLevel').textContent = s.level.level;
    $('#hudLevelTxt').textContent = s.level.level;
    $('#hudXpFill').style.width = s.level.pct + '%';
    $('#hudXpTxt').textContent = U.fmtNum(s.level.cur) + ' / ' + U.fmtNum(s.level.need) + ' XP';

    /* сайдбар */
    const rb = $('#sideRank .rank-mini__badge');
    if (rb) { rb.textContent = s.rank.key; }
    $('#sideRankName').textContent = s.rank.name;
    $('#sideXpFill').style.width = s.level.pct + '%';
    $('#sideXpTxt').textContent = U.fmtNum(s.level.cur) + ' / ' + U.fmtNum(s.level.need) + ' XP';

    /* индикатор невыполненных дел */
    const n = Store.notifications();
    $('#bellDot').hidden = n.length === 0;
    $('#btnSound').classList.toggle('is-off', !SFX.isOn());
    const fm = $('#footMsg');
    if (fm) {
      const g = s.goals;
      const left = [];
      if (!g.weight) left.push('взвесься');
      if (!g.water) left.push('пей воду');
      if (!g.protein && s.totals.items) left.push('добавь белок');
      if (!g.workout) left.push('тренировка');
      fm.textContent = left.length ? ('Ожидают: ' + left.join(' · ')) : 'Все цели дня выполнены · система довольна';
    }
  }

  function tick() {
    const d = new Date();
    $('#hudClock').textContent = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()) + ':' + U.pad(d.getSeconds());
    $('#hudDate').textContent = U.fmtDateFull(U.today());
    /* смена суток на лету */
    if (window.App && Store.state().meta.lastSeenDate !== U.today()) rollover();
  }

  function checkReminders() {
    const st = Store.settings();
    const meta = Store.state().meta;
    if (!st.remindOn) return;
    if (meta.lastRemind === U.today()) return;
    const now = U.pad(new Date().getHours()) + ':' + U.pad(new Date().getMinutes());
    if (now < st.remindTime) return;
    const n = Store.notifications();
    if (!n.length) { meta.lastRemind = U.today(); Store.save(); return; }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Система · ' + U.fmtDateFull(U.today()), {
        body: n[0].t + ' — ' + n[0].d, icon: 'assets/img/icon.svg'
      });
    }
    UI.alert({ kind: 'info', tag: 'ЕЖЕДНЕВНЫЙ ОТЧЁТ', life: 9000,
      title: n.length + ' ' + U.plural(n.length, 'задача', 'задачи', 'задач') + ' ждут',
      text: n.slice(0, 3).map(x => '▸ ' + U.esc(x.t)).join('<br>') });
    meta.lastRemind = U.today();
    Store.save();
  }

  /* ═══ 5. ПОСЛЕ ДЕЙСТВИЯ ═══ */
  /* вызывается после каждого изменения состояния: перерисовка + батч уведомлений */
  function afterAction() {
    Store.checkQuests(U.today());
    Store.checkStreakReward();
    Store.checkAllAchievements();
    Store.checkDayComplete(U.today());
    Store.emit();
    const b = Store.takeBatch();
    if (b.ach.length) UI.achAlert(b.ach);
    else if (b.levels.length) UI.levelUpAlert(b.levels);
    /* защита от спама перерисовки */
    const now = Date.now();
    if (now - lastActionAt > 120) { lastActionAt = now; }
    refresh();
  }

  /* ═══ 6. ОБОЛОЧКА ═══ */
  function wireShell() {
    if (shellWired) return;
    shellWired = true;
    /* бургер */
    const burger = $('#burger');
    if (burger) burger.addEventListener('click', function () {
      $('.side').classList.toggle('is-open');
      SFX.play('tick');
    });
    /* звук */
    const bs = $('#btnSound');
    if (bs) bs.addEventListener('click', function () {
      const v = !SFX.isOn();
      SFX.setOn(v);
      Store.saveSettings({ sound: v });
      bs.classList.toggle('is-off', !v);
      if (v) SFX.play('log');
    });
    /* уведомления */
    const bb = $('#btnBell');
    if (bb) bb.addEventListener('click', function () {
      const n = Store.notifications();
      SFX.play('click');
      if (!n.length) { UI.ok('Всё закрыто', 'Все цели дня выполнены. Система довольна охотником.'); return; }
      UI.modal({
        title: 'СИСТЕМА ТРЕБУЕТ ВНИМАНИЯ',
        html: '<div class="list">' + n.map(function (x, i) {
          return '<a class="li" href="' + x.go + '" data-close><div class="li__ico">' + x.ic + '</div>' +
            '<div class="li__b"><b>' + U.esc(x.t) + '</b><span>' + U.esc(x.d) + '</span></div>' +
            '<div class="li__r"><i class="ico" data-ico="down" style="transform:rotate(-90deg)"></i></div></a>';
        }).join('') + '</div>'
      });
    });
    /* клик по фону модалки */
    U.on(document, 'click', '[data-close]', function () { UI.closeModal(); });
    /* первый клик — разблокировка звука */
    document.addEventListener('pointerdown', function once() {
      SFX.ensure(); SFX.resume();
      document.removeEventListener('pointerdown', once);
    }, { once: true });
    /* клавиатура */
    document.addEventListener('keydown', keys);
    /* пересчёт при возврате на вкладку */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { updateHud(); }
    });
  }

  function keys(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const map = { '1': 'dashboard', '2': 'weight', '3': 'nutrition', '4': 'training', '5': 'quests', '6': 'progress', '7': 'settings' };
    if (map[e.key]) { location.hash = '#/' + map[e.key]; return; }
    const k = e.key.toLowerCase();
    if (k === 'n' && Store.state().settings.onboarded) { e.preventDefault(); Views.weight.weighModal(U.today()); }
    if (k === 'f' && Store.state().settings.onboarded) { e.preventDefault(); Views.nutrition.addModal('breakfast'); }
    if (k === 'w' && Store.state().settings.onboarded) { e.preventDefault(); location.hash = '#/training'; }
    if (e.key === ' ' && Store.state().settings.onboarded) {
      e.preventDefault();
      const s = Store.snapshot();
      const next = s.quests.find(q => !s.doneToday[q.id] && Store.questProgress(q.metric, U.today()) >= (q.target || 1));
      if (next) { Store.completeQuest(U.today(), next.id); SFX.play('quest'); UI.xpAlert(next.xp, next.title); afterAction(); }
      else UI.info('Нет доступных заданий', 'Выполни условие — задание закроется само.');
    }
  }

  /* ═══ 7. ФОНОВЫЕ ЧАСТИЦЫ ═══ */
  function applyParticles() {
    const host = $('#bgParticles');
    if (!host) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const n = innerWidth < 860 ? 16 : 34;
    let html = '';
    for (let i = 0; i < n; i++) {
      const sz = (Math.random() * 2.4 + 1).toFixed(1);
      html += '<span class="pt" style="left:' + (Math.random() * 100).toFixed(1) + '%;' +
        'width:' + sz + 'px;height:' + sz + 'px;' +
        'animation-duration:' + (14 + Math.random() * 20).toFixed(1) + 's;' +
        'animation-delay:' + (-Math.random() * 30).toFixed(1) + 's"></span>';
    }
    host.innerHTML = html;
  }

  /* ═══ 8. ОНБОРДИНГ ═══ */
  function showOnboarding() {
    const bs = $('#boot');
    if (bs) bs.classList.add('is-done');
    const wrap = document.createElement('div');
    wrap.className = 'shell';
    wrap.id = 'obShell';
    wrap.innerHTML =
      '<div class="main" style="grid-column:1/-1">' +
        '<header class="hud"><div class="hud__left"><div class="hud__date">ИНИЦИАЛИЗАЦИЯ</div>' +
        '<div class="hud__clock">SYSTEM</div></div>' +
        '<div class="hud__right"><span class="win__tag">МАСТЕР НАСТРОЙКИ</span></div></header>' +
        '<main class="view" id="obView"></main>' +
      '</div>';
    document.body.appendChild(wrap);

    let step = 0;
    const data = {
      name: 'Охотник', sex: 'male', birthDate: '', height: 178, weight: 82,
      mode: 'cut', startWeight: 82, targetWeight: 72, ratePerWeek: 0.7
    };

    function draw() {
      const v = $('#obView');
      let html = '';
      if (step === 0) {
        html = '<div class="ob"><div class="ob__hero">' +
          '<h1>SYSTEM</h1>' +
          '<p>Персональный трекер снижения веса. Каждое действие превращается в опыт, опыт — в ранг. Так работает статусное окно охотника — так будет работать и твоя система.</p>' +
          '<div class="ob__steps">' + [0, 1, 2, 3].map(i => '<i class="' + (i <= step ? 'is-on' : '') + '"></i>').join('') + '</div>' +
          '</div>' +
          '<div class="ob-form">' +
            '<div class="row" style="gap:10px">' +
              '<div class="tile" style="flex:1"><b class="t-hud" style="color:var(--gold)">⚖️</b>' +
                '<div class="tile__lbl mt1">Дневник</div><div class="tile__sub">Вес, еда, вода, замеры</div></div>' +
              '<div class="tile" style="flex:1"><b class="t-hud" style="color:var(--gold)">⚔️</b>' +
                '<div class="tile__lbl mt1">Тренировки</div><div class="tile__sub">Планы, подходы, объём, ПР</div></div>' +
              '<div class="tile" style="flex:1"><b class="t-hud" style="color:var(--gold)">📜</b>' +
                '<div class="tile__lbl mt1">Задания</div><div class="tile__sub">Ежедневные квесты за опыт</div></div>' +
              '<div class="tile" style="flex:1"><b class="t-hud" style="color:var(--gold)">🏆</b>' +
                '<div class="tile__lbl mt1">Достижения</div><div class="tile__sub">Ранги E → Монарх</div></div>' +
            '</div>' +
            '<div class="brief mt2"><h4>Как это работает</h4>' +
              '<p>Система считает базальный обмен по формуле Миффлина–Сан Жеора, добавляет твою активность, и по режиму и скорости выводит калории и макросы. Дальше остаётся только честно отмечать действия.</p>' +
              '<ul><li>Взвешивание утром натощак — точная база тренда</li>' +
              '<li>Белок 1,8–2,0 г/кг — чтобы худеть, а не терять мышцы</li>' +
              '<li>Дефицит 300–800 ккал в день — темп 0,3–1 кг в неделю</li>' +
              '<li>Силу и шаги никогда не отменяй: они решают результат</li></ul>' +
            '</div>' +
            '<button class="btn btn--block" id="obNext">Начать настройку</button>' +
          '</div></div>';
      }
      if (step === 1) {
        html = '<div class="ob"><div class="ob__hero" style="padding-bottom:10px">' +
          '<h1 style="font-size:26px">Кто ты, охотник?</h1>' +
          '<p>Нужны параметры, чтобы рассчитать обмен и цели.</p>' +
          '<div class="ob__steps">' + [0, 1, 2, 3].map(i => '<i class="' + (i <= step ? 'is-on' : '') + '"></i>').join('') + '</div>' +
          '</div><div class="form-grid">' +
            '<div class="field"><label>Имя</label><input class="inp" id="obName" value="' + U.esc(data.name) + '"></div>' +
            '<div class="field"><label>Пол</label><select class="sel" id="obSex">' +
              '<option value="male"' + (data.sex === 'male' ? ' selected' : '') + '>Мужской</option>' +
              '<option value="female"' + (data.sex === 'female' ? ' selected' : '') + '>Женский</option></select></div>' +
            '<div class="field"><label>Дата рождения</label><input class="inp" id="obBirth" type="date" value="' + data.birthDate + '" max="' + U.today() + '"></div>' +
            '<div class="field"><label>Рост, см</label><input class="inp inp--num" id="obH" type="number" value="' + data.height + '" min="130" max="230"></div>' +
            '<div class="field"><label>Текущий вес, кг</label><input class="inp inp--num" id="obW" type="number" step="0.1" value="' + data.weight + '"></div>' +
            '<div class="field"><label>Активность в неделю</label><select class="sel" id="obA">' +
              C.ACTIVITY.map(a => '<option value="' + a.v + '"' + (Math.abs((data.activity || 1.375) - a.v) < 0.01 ? ' selected' : '') + '>' + a.k + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div class="row mt3"><button class="btn btn--ghost" id="obBack">Назад</button>' +
          '<button class="btn" id="obNext">Дальше</button></div></div>';
      }
      if (step === 2) {
        const p = Object.assign({ birthDate: data.birthDate, height: data.height, activity: data.activity || 1.375 }, data);
        const m = C.macroTarget(p, data.weight);
        html = '<div class="ob"><div class="ob__hero" style="padding-bottom:10px">' +
          '<h1 style="font-size:26px">Цель</h1>' +
          '<p>Режим и темп. Система посчитает калории и макросы, а график покажет, идеальна ли скорость.</p>' +
          '<div class="ob__steps">' + [0, 1, 2, 3].map(i => '<i class="' + (i <= step ? 'is-on' : '') + '"></i>').join('') + '</div>' +
          '</div><div class="form-grid">' +
            '<div class="field" style="grid-column:1/-1"><label>Режим</label><div class="seg" id="obMode" style="width:100%">' +
              '<button data-m="cut" style="flex:1"' + (data.mode === 'cut' ? ' class="is-on"' : '') + '>Сушка</button>' +
              '<button data-m="maintain" style="flex:1"' + (data.mode === 'maintain' ? ' class="is-on"' : '') + '>Поддержание</button>' +
              '<button data-m="bulk" style="flex:1"' + (data.mode === 'bulk' ? ' class="is-on"' : '') + '>Набор</button></div></div>' +
            '<div class="field"><label>Стартовый вес, кг</label><input class="inp inp--num" id="obStart" type="number" step="0.1" value="' + data.startWeight + '"></div>' +
            '<div class="field"><label>Целевой вес, кг</label><input class="inp inp--num" id="obTarget" type="number" step="0.1" value="' + data.targetWeight + '"></div>' +
            '<div class="field" style="grid-column:1/-1"><label>Скорость: <b id="obRateLbl">' + data.ratePerWeek.toFixed(1) + '</b> кг в неделю</label>' +
              '<input type="range" id="obRate" min="0.1" max="1.5" step="0.1" value="' + data.ratePerWeek + '" style="width:100%">' +
              '<div class="row" style="justify-content:space-between"><span class="t-xs t-mute">0.1 · безопасная</span>' +
              '<span class="t-xs t-mute">1.5 · агрессивная</span></div></div>' +
          '</div>' +
          '<hr class="hr">' +
          '<div class="lbl mb1">Расчёт системы</div>' +
          '<div class="ob-preview" id="obPrev">' + prev(m) + '</div>' +
          '<div class="row mt3"><button class="btn btn--ghost" id="obBack">Назад</button>' +
          '<button class="btn" id="obNext">Дальше</button></div></div>';
      }
      if (step === 3) {
        const p = Object.assign({ birthDate: data.birthDate, height: data.height, activity: data.activity || 1.375 }, data);
        const m = C.macroTarget(p, data.weight);
        const weeks = Math.abs(data.startWeight - data.targetWeight) / data.ratePerWeek;
        html = '<div class="ob"><div class="ob__hero" style="padding-bottom:10px">' +
          '<h1 style="font-size:26px">Ожидаемый результат</h1>' +
          '<p>Так система будет считать твои нормы. Значения можно менять в любой момент в разделе «Система».</p>' +
          '<div class="ob__steps">' + [0, 1, 2, 3].map(i => '<i class="' + (i <= step ? 'is-on' : '') + '"></i>').join('') + '</div>' +
          '</div>' +
          '<div class="ob-preview">' + prev(m) + '</div>' +
          '<div class="brief mt3"><h4>План действий</h4>' +
            '<p>От <b>' + data.startWeight + '</b> до <b>' + data.targetWeight + '</b> кг со скоростью ' + data.ratePerWeek + ' кг/нед — это примерно <b>' + Math.ceil(weeks) + '</b> ' +
            U.plural(Math.ceil(weeks), 'неделя', 'недели', 'недель') + '.</p>' +
            '<ul><li>Каждый день: взвешивание, вода, дневник еды</li>' +
            '<li>4 раза в неделю: силовая по плану, 2 — кардио или шаги</li>' +
            '<li>Каждую неделю: замеры тела и проверка тренда</li>' +
            '<li>Задачи закрываются сами, опыт капает за каждое действие</li></ul>' +
          '</div>' +
          '<div class="row mt3"><button class="btn btn--ghost" id="obBack">Назад</button>' +
          '<button class="btn" id="obGo"><i class="ico" data-ico="crown"></i>Войти в систему</button></div></div>';
      }
      v.innerHTML = html;
      wire(v.firstElementChild);

      function prev(m) {
        return '<div class="qs"><b>' + U.fmtNum(m.kcal) + '</b><span>ККАЛ / ДЕНЬ</span></div>' +
          '<div class="qs"><b>' + m.protein + '</b><span>БЕЛОК, Г</span></div>' +
          '<div class="qs"><b>' + m.fat + '</b><span>ЖИРЫ, Г</span></div>' +
          '<div class="qs"><b>' + m.carbs + '</b><span>УГЛЕВОДЫ, Г</span></div>' +
          '<div class="qs"><b>' + C.waterTarget({ startWeight: data.weight }) + '</b><span>ВОДА, МЛ</span></div>';
      }
      function mkProfile() {
        return { birthDate: data.birthDate, height: data.height, activity: data.activity || 1.375, sex: data.sex, name: data.name };
      }
      function updatePrev() {
        const m = C.macroTarget(Object.assign(mkProfile(), { mode: data.mode, ratePerWeek: data.ratePerWeek }), data.weight);
        const pv = $('#obPrev');
        if (pv) pv.innerHTML = prev(m);
        const lbl = $('#obRateLbl');
        if (lbl) lbl.textContent = data.ratePerWeek.toFixed(1);
      }
      function wire(box) {
        if (!box) return;
        U.on(box, 'click', '#obNext', function () {
          /* забираем значения */
          const g = function (id) { const n = $('#' + id, box); return n ? n.value : null; };
          if (step === 1) {
            data.name = (g('obName') || '').trim() || 'Охотник';
            data.sex = g('obSex');
            data.birthDate = g('obBirth');
            data.height = U.num(g('obH'), 178);
            data.weight = U.num(g('obW'), 82);
            data.startWeight = data.weight;
            data.activity = U.num(g('obA'), 1.375);
            if (data.weight < 35) { UI.warn('Проверь вес', 'Недопустимо мало для расчёта.'); return; }
          }
          if (step === 2) {
            data.startWeight = U.num(g('obStart'), data.weight);
            data.targetWeight = U.num(g('obTarget'), data.weight - 10);
          }
          step++;
          SFX.play('tick');
          draw();
        });
        U.on(box, 'click', '#obBack', function () { step--; SFX.play('click'); draw(); });
        U.on(box, 'click', '#obMode button', function (e, b) {
          data.mode = b.getAttribute('data-m');
          $$('#obMode button', box).forEach(x => x.classList.remove('is-on'));
          b.classList.add('is-on');
          SFX.play('click');
          updatePrev();
        });
        U.on(box, 'input', '#obRate', function (e) { data.ratePerWeek = U.num(e.target.value, 0.7); updatePrev(); });
        U.on(box, 'change', '#obTarget', function () { updatePrev(); });
        /* финальная кнопка живёт только на шаге 3, поэтому слушатель
           вешаем на свежий узел box, а не на постоянный #obView */
        U.on(box, 'click', '#obGo', function () { bootOnb(data, wrap); });
      }
    }
    draw();
  }

  /* завершение онбординга */
  function bootOnb(data, wrap) {
    if (Store.settings().onboarded) return;
    Store.saveProfile({
      name: data.name, sex: data.sex, birthDate: data.birthDate,
      height: data.height, activity: data.activity, startWeight: data.weight
    });
    Store.saveGoal({ mode: data.mode, startWeight: data.startWeight, targetWeight: data.targetWeight, ratePerWeek: data.ratePerWeek });
    Store.saveSettings({ onboarded: true });
    /* стартовая запись веса, чтобы график сразу жил */
    if (!Store.weightOn(U.today())) Store.logWeight(U.today(), data.startWeight, null, 'старт системы');
    Store.addXp(50, 'Инициализация системы', '💠', U.today());
    Store.commit('Система инициализирована');
    SFX.play('levelup');
    FX.levelUp();
    UI.alert({ kind: 'level', tag: 'СИСТЕМА ИНИЦИАЛИЗИРОВАНА', life: 7000,
      title: 'Добро пожаловать, ' + data.name,
      text: 'Уровень 1 · +50 XP за старт. Загляни в «Задания» — там уже есть твои первые цели.' });
    wrap.remove();
    $('#shell').hidden = false;
    startApp();
  }

  /* ═══ 9. СТАРТ ═══ */
  function init() {
    const lines = ['ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ…', 'ЗАГРУЗКА ПРОТОКОЛА…', 'СИНХРОНИЗАЦИЯ ДАННЫХ…', 'СИСТЕМА АКТИВНА'];
    let i = 0;
    const bt = $('#bootText');
    const iv = setInterval(function () {
      i++;
      if (bt) bt.textContent = lines[i] || lines[lines.length - 1];
      if (i >= lines.length - 1) {
        clearInterval(iv);
        setTimeout(function () {
          $('#boot').classList.add('is-done');
          boot();
        }, 420);
      }
    }, 300);
    /* страховка: если что-то зависло */
    setTimeout(function () {
      const b = $('#boot');
      if (b && !b.classList.contains('is-done')) {
        clearInterval(iv);
        b.classList.add('is-done');
        boot();
      }
    }, 4200);
  }

  document.addEventListener('DOMContentLoaded', init);

  /* service worker: только по http(s), не для file:// */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* офлайн не критичен */ });
    });
  }

  return { boot, bootHard, refresh, afterAction, updateHud, init, route };
})();
