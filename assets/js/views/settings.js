/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/settings.js  ·  СИСТЕМА (профиль, данные)
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.settings = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;

  const THEMES = [
    { k:'azure',  n:'AZURE',  c1:'#2f7bff', c2:'#0b3fa8' },
    { k:'violet', n:'VIOLET', c1:'#8b5cf6', c2:'#4c1d95' },
    { k:'cyan',   n:'CYAN',   c1:'#00bcd4', c2:'#0a5c6b' },
    { k:'blood',  n:'BLOOD',  c1:'#ff2e5b', c2:'#8c0f2c' },
    { k:'gold',   n:'GOLD',   c1:'#f0a417', c2:'#8a5c00' }
  ];

  /* ── ПРОФИЛЬ ── */
  function profileBlock(s) {
    const p = s.profile, w = s.weight;
    const mk = C.macroTarget(Store.plan(), w);
    return '<div class="panel"><div class="panel__head"><h3>Профиль охотника</h3><span class="grow"></span>' +
      '<button class="btn btn--sm" id="sSaveProfile">Сохранить</button></div>' +
      '<div class="panel__body"><div class="form-grid">' +
        '<div class="field"><label>Имя</label><input class="inp" id="pName" value="' + U.esc(p.name) + '"></div>' +
        '<div class="field"><label>Пол</label><select class="sel" id="pSex">' +
          '<option value="male"' + (p.sex === 'male' ? ' selected' : '') + '>Мужской</option>' +
          '<option value="female"' + (p.sex === 'female' ? ' selected' : '') + '>Женский</option></select></div>' +
        '<div class="field"><label>Дата рождения</label><input class="inp" id="pBirth" type="date" value="' + (p.birthDate || '') + '" max="' + U.today() + '"></div>' +
        '<div class="field"><label>Рост, см</label><input class="inp inp--num" id="pHeight" type="number" value="' + p.height + '" min="130" max="230"></div>' +
        '<div class="field"><label>Вес, кг</label><input class="inp inp--num" id="pWeight" type="number" step="0.1" value="' + (w || '') + '"></div>' +
        '<div class="field"><label>Активность</label><select class="sel" id="pAct">' +
          C.ACTIVITY.map(a => '<option value="' + a.v + '"' + (Math.abs(p.activity - a.v) < 0.01 ? ' selected' : '') + '>' + a.k + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<p class="t-xs t-mute mt1" id="pActDesc">' + (C.ACTIVITY.find(a => Math.abs(a.v - p.activity) < 0.01) || {}).desc + '</p>' +
      '<hr class="hr">' +
      '<div class="lbl mb1">Расчёт системы</div>' +
      '<div class="quest-stats">' +
        '<div class="qs"><b>' + C.age(p) + '</b><span>ЛЕТ</span></div>' +
        '<div class="qs"><b>' + U.fmtNum(C.bmr(p, w)) + '</b><span>БАЗАЛЬНЫЙ ОБМЕН</span></div>' +
        '<div class="qs"><b>' + U.fmtNum(C.tdee(p, w)) + '</b><span>РАСХОД В ПОКОЕ + БЫТ</span></div>' +
        '<div class="qs"><b>' + U.fmtNum(mk.kcal) + '</b><span>ЦЕЛЬ, ККАЛ</span></div>' +
        '<div class="qs"><b>' + mk.protein + '</b><span>БЕЛОК, Г</span></div>' +
        '<div class="qs"><b>' + mk.fat + '</b><span>ЖИРЫ, Г</span></div>' +
        '<div class="qs"><b>' + mk.carbs + '</b><span>УГЛЕВОДЫ, Г</span></div>' +
        '<div class="qs"><b>' + C.waterTarget({ startWeight: w || 78 }) + '</b><span>ВОДА, МЛ</span></div>' +
      '</div>' +
      '<p class="t-xs t-mute mt1">Формула Миффлина–Сан Жеора. Базовый обмен — энергия в полном покое. Цель = расход с поправкой на режим и недельную скорость.</p>' +
      '</div></div>';
  }

  /* ── ЦЕЛЬ ── */
  function goalBlock(s) {
    const g = s.goal;
    return '<div class="panel"><div class="panel__head"><h3>Цель</h3><span class="grow"></span>' +
      '<button class="btn btn--ghost btn--sm" id="sEditGoal">Настроить</button></div>' +
      '<div class="panel__body">' +
        '<div class="stat-line"><span>Режим</span><b>' + (g.mode === 'cut' ? 'Сушка (дефицит)' : g.mode === 'bulk' ? 'Набор массы' : 'Поддержание') + '</b></div>' +
        '<div class="stat-line"><span>Стартовый вес</span><b>' + (g.startWeight || '—') + ' кг</b></div>' +
        '<div class="stat-line"><span>Целевой вес</span><b>' + (g.targetWeight || '—') + ' кг</b></div>' +
        '<div class="stat-line"><span>Скорость</span><b>' + (g.mode === 'cut' ? '−' : g.mode === 'bulk' ? '+' : '') + (g.ratePerWeek || 0) + ' кг/нед</b></div>' +
        '<div class="stat-line"><span>Дедлайн</span><b>' + (g.deadline ? U.fmtDate(g.deadline) : 'не задан') + '</b></div>' +
        '<div class="stat-line"><span>Прогноз по тренду</span><b>' + (s.eta ? U.fmtDate(s.eta) : '—') + '</b></div>' +
        '<div class="stat-line"><span>Выполнено</span><b class="up">' + Math.round(s.progress) + '%</b></div>' +
      '</div></div>';
  }

  /* ── ВНЕШНИЙ ВИД ── */
  function themeBlock() {
    return '<div class="panel"><div class="panel__head"><h3>Оформление</h3></div><div class="panel__body">' +
      '<div class="theme-pick">' + THEMES.map(t =>
        '<button class="th ' + (Store.settings().theme === t.k ? 'is-on' : '') + '" data-theme="' + t.k + '" data-n="' + t.n + '" style="color:' + t.c1 + '">' +
        '<i style="background:linear-gradient(140deg,' + t.c1 + ',' + t.c2 + ')"></i></button>').join('') +
      '</div>' +
      '<hr class="hr">' +
      '<div class="set-row"><div class="set-row__b"><b>Звуки системы</b><span>Короткие сигналы при действиях, повышении уровня и достижениях</span></div>' +
      '<div class="set-row__c"><div class="sw ' + (Store.settings().sound ? 'is-on' : '') + '" id="sSound"></div></div></div>' +
      '<div class="set-row"><div class="set-row__b"><b>Напоминание</b><span>Браузер напомнит о взвешивании и дневных целях</span></div>' +
      '<div class="set-row__c"><div class="sw ' + (Store.settings().remindOn ? 'is-on' : '') + '" id="sRemind"></div></div></div>' +
      '<div class="set-row"' + (Store.settings().remindOn ? '' : ' style="opacity:.4"') + '><div class="set-row__b"><b>Время напоминания</b><span>Для работы нужно разрешение браузера на уведомления</span></div>' +
      '<div class="set-row__c"><input class="inp" id="sTime" type="time" value="' + Store.settings().remindTime + '" style="width:130px"></div></div>' +
      '<div class="set-row"><div class="set-row__b"><b>Взвешивание</b><span>Удобное время фиксации веса</span></div>' +
      '<div class="set-row__c"><div class="seg" id="sWeighIn">' +
        '<button data-w="morning" class="' + (Store.settings().weighIn === 'morning' ? 'is-on' : '') + '">утром</button>' +
        '<button data-w="evening" class="' + (Store.settings().weighIn === 'evening' ? 'is-on' : '') + '">вечером</button>' +
      '</div></div></div>' +
      '</div></div>';
  }

  /* ── ДАННЫЕ ── */
  function dataBlock(s) {
    const st = Store.state();
    return '<div class="panel"><div class="panel__head"><h3>Данные</h3><span class="grow"></span>' +
      '<span class="tag">' + (localStorage.getItem('system.solo.v1') || '').length + ' байт в браузере</span></div>' +
      '<div class="panel__body">' +
        '<div class="stat-line"><span>Замеров веса</span><b>' + st.weight.length + '</b></div>' +
        '<div class="stat-line"><span>Замеров тела</span><b>' + st.body.length + '</b></div>' +
        '<div class="stat-line"><span>Дней с питанием</span><b>' + Object.keys(st.meals).length + '</b></div>' +
        '<div class="stat-line"><span>Тренировок</span><b>' + st.workouts.length + '</b></div>' +
        '<div class="stat-line"><span>Записей в ленте опыта</span><b>' + st.xpLog.length + '</b></div>' +
        '<div class="stat-line"><span>Достижений</span><b>' + s.achCount.got + ' / ' + s.achCount.all + '</b></div>' +
        '<div class="stat-line"><span>Всего опыта</span><b>' + U.fmtNum(st.xp) + ' XP</b></div>' +
        '<hr class="hr">' +
        '<div class="row">' +
          '<button class="btn btn--ghost btn--sm" id="dExport"><i class="ico" data-ico="download"></i>Резервная копия (JSON)</button>' +
          '<button class="btn btn--ghost btn--sm" id="dCsv"><i class="ico" data-ico="download"></i>Таблица (CSV)</button>' +
          '<button class="btn btn--ghost btn--sm" id="dImport"><i class="ico" data-ico="upload"></i>Импорт</button>' +
        '</div>' +
        '<p class="t-xs t-mute mt1">Все данные лежат только в этом браузере (localStorage). Копия раз в неделю — хорошая привычка. Файл импорта полностью заменит текущие данные.</p>' +
      '</div></div>';
  }

  /* ── ОПАСНАЯ ЗОНА ── */
  function dangerBlock() {
    return '<div class="panel panel--notch danger-zone"><div class="panel__head"><h3>Опасная зона</h3></div>' +
      '<div class="panel__body">' +
        '<div class="set-row"><div class="set-row__b"><b>Очистить журналы</b><span>Удалит вес, питание, тренировки, квесты и опыт. Профиль и цели останутся.</span></div>' +
        '<div class="set-row__c"><button class="btn btn--danger btn--sm" id="dClear">Очистить</button></div></div>' +
        '<div class="set-row"><div class="set-row__b"><b>Полный сброс</b><span>Удалит вообще всё, включая профиль. Начать с чистого листа.</span></div>' +
        '<div class="set-row__c"><button class="btn btn--danger btn--sm" id="dReset">Сбросить всё</button></div></div>' +
        '<div class="set-row"><div class="set-row__b"><b>Демо-данные</b><span>Заполнить журналы за 30 дней, чтобы посмотреть, как всё работает</span></div>' +
        '<div class="set-row__c"><button class="btn btn--ghost btn--sm" id="dDemo">Заполнить</button></div></div>' +
      '</div></div>';
  }

  /* ── О СИСТЕМЕ ── */
  function about() {
    return '<div class="panel"><div class="panel__head"><h3>О системе</h3></div><div class="panel__body">' +
      '<div class="win" style="padding:16px">' +
        '<div class="win__top"><span class="win__tag">СИСТЕМА v1.0</span><span class="win__live">СТАБИЛЬНО</span></div>' +
        '<p style="margin:0;font-size:13px;color:var(--tx-dim)">Персональный трекер снижения веса. Оформление вдохновлено интерфейсом статусного окна из «Solo Leveling»: система показывает твой прогресс как характеристики персонажа, а каждое действие даёт опыт и повышает ранг.</p>' +
      '</div>' +
      '<div class="mt3">' +
        '<div class="lbl mb1">Как работает опыт</div>' +
        '<div class="list">' +
          ['weight|⚖️|Взвешивание|20', 'meal|🍽️|Запись в дневник|15', 'water|💧|Цель по воде|10',
           'workout|⚔️|Тренировка|60', 'measure|📏|Замеры тела|25', 'quest|📜|Задание|по условию',
           'streak|🔥|Бонус за серию|50–2500', 'perfect|💠|Идеальный день|75']
          .map(x => { const p = x.split('|'); return '<div class="li"><div class="li__ico">' + p[1] + '</div>' +
            '<div class="li__b"><b>' + p[2] + '</b></div><div class="li__r"><b class="up">+' + p[3] + '</b><span>XP</span></div></div>'; }).join('') +
        '</div>' +
      '</div>' +
      '<hr class="hr">' +
      '<div class="lbl mb1">Сочетания клавиш</div>' +
      '<div class="list">' +
        [['1…7', 'переключение разделов'], ['N', 'новая запись веса'], ['F', 'добавить еду'],
         ['W', 'начать тренировку'], ['Space', 'отметить первое задание дня'], ['Esc', 'закрыть окно']]
        .map(x => '<div class="li"><span class="kbd" style="min-width:64px;text-align:center">' + x[0] + '</span>' +
          '<div class="li__b"><b>' + x[1] + '</b></div></div>').join('') +
      '</div>' +
      '<hr class="hr">' +
      '<p class="t-xs t-mute">Работает офлайн после первого открытия. Данные не уходят ни на какой сервер. ' +
      'Формулы: Миффлин–Сан Жеор (обмен), 7700 ккал на кг жира, 1 г белка = 4 ккал, 1 г жира = 9 ккал, 1 г углеводов = 4 ккал. ' +
      'Оценка состава тела — по формуле Дьюренберг, точность ±4%, для ориентира.</p>' +
    '</div></div>';
  }

  /* ── DEMO ── */
  function demoData() {
    const p = Store.profile();
    const startW = 88;
    const base = Store.goal().startWeight || startW;
    const meals = [
      [['oats', 60], ['milk_25', 200], ['egg', 100], ['banana', 100]],
      [['chicken_breast', 180], ['buckwheat', 200], ['cucumber', 120], ['olive_oil', 10]],
      [['cod', 200], ['potato', 200], ['greens', 15]],
      [['cottage_5', 150], ['apple', 150], ['almond', 20]]
    ];
    const mealIds = ['breakfast', 'lunch', 'dinner', 'snack'];
    const exSets = [['squat', 4, 50, 8], ['bench', 4, 40, 8], ['lat_pulldown', 3, 35, 10], ['plank', 3, 0, 60]];
    for (let i = 29; i >= 0; i--) {
      const d = U.addDays(U.today(), -i);
      const prog = (29 - i) / 29;
      const w = U.round(base - prog * 6.4 + (Math.random() * 1.6 - 0.8), 1);
      if (i % 1 === 0) Store.logWeight(d, w, U.round(24 - prog * 4, 1), i === 0 ? 'утро натощак' : '');
      if (i % 7 === 0) Store.logBody(d, { waist: U.round(98 - prog * 6, 1), hip: U.round(112 - prog * 5, 1), chest: 104, arm: 38, thigh: 60 });
      Store.addWater(d, Math.random() > 0.25 ? 2000 : 1500);
      if (i % 2 === 0) Store.setSteps(d, 6000 + Math.round(Math.random() * 7000));
      if (i % 3 !== 0) Store.setSleep(d, Math.random() > 0.3 ? 7.5 : 6.5);
      const n = i % 5 === 0 ? 3 : 4;
      for (let m = 0; m < n; m++) {
        const list = meals[m];
        list.forEach(function (it) { Store.addFood(d, mealIds[m], it[0], it[1]); });
      }
      if (i % 2 === 0) {
        const ex = exSets.map(function (e) {
          return { id: e[0], mode: window.DB_EX.exMode(e[0]),
            sets: Array.apply(null, Array(e[1])).map(function (_, si) {
              return { kg: e[2] + si * 2.5 + Math.round(prog * 10), reps: e[3], time: 0 };
            }) };
        });
        Store.logWorkout({ date: d, name: i % 4 === 0 ? 'Силовая: низ' : 'Силовая: верх', duration: 55,
          group: i % 4 === 0 ? 'legs' : 'chest', ex: ex, note: '' });
      }
    }
    Store.saveGoal({ startWeight: base, targetWeight: U.round(base - 10, 1) });
    Store.commit('Демо-данные созданы');
  }

  /* ── RENDER ── */
  function render(host) {
    const s = Store.snapshot();
    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Система</h1>' +
        '<p>Профиль, цели, оформление и данные. Всё хранится локально в этом браузере.</p>' +
      '</div><div class="row">' +
        '<span class="tag tag--violet">v1.0</span>' +
        '<a class="btn btn--ghost btn--sm" href="#/dashboard"><i class="ico" data-ico="home"></i>К статусу</a>' +
      '</div></div>' +

      '<div class="grid g-2-1">' +
        '<div class="stack">' + profileBlock(s) + goalBlock(s) + dataBlock(s) + dangerBlock() + '</div>' +
        '<div class="stack">' + themeBlock() + about() + '</div>' +
      '</div>';
  }

  /* ── MOUNT ── */
  function mount(host) {
    /* описание активности */
    const upd = function () {
      const a = C.ACTIVITY.find(x => Math.abs(x.v - U.num(U.$('#pAct', host).value, 1.375)) < 0.01);
      const d = U.$('#pActDesc', host);
      if (d && a) d.textContent = a.desc;
    };
    U.on(host, 'change', '#pAct', upd);

    U.on(host, 'click', '#sSaveProfile', function () {
      Store.saveProfile({
        name: U.$('#pName', host).value.trim() || 'Охотник',
        sex: U.$('#pSex', host).value,
        birthDate: U.$('#pBirth', host).value,
        height: U.num(U.$('#pHeight', host).value, 178),
        activity: U.num(U.$('#pAct', host).value, 1.375)
      });
      const w = U.num(U.$('#pWeight', host).value, 0);
      /* новый вес = новая запись */
      if (w && (!Store.weightOn(U.today()) || Store.weightOn(U.today()).kg !== w)) {
        Store.logWeight(U.today(), w, '', 'из профиля');
      }
      Store.checkQuests(U.today());
      SFX.play('log');
      UI.ok('Профиль сохранён', 'Калории и макросы пересчитаны.');
      App.afterAction();
    });

    U.on(host, 'click', '#sEditGoal', () => Views.weight.goalModal());

    /* тема */
    U.on(host, 'click', '.th', function (e, b) {
      const k = b.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', k);
      Store.saveSettings({ theme: k });
      SFX.play('tick');
      App.refresh();
    });

    /* звук */
    U.on(host, 'click', '#sSound', function (e, sw) {
      const v = !Store.settings().sound;
      sw.classList.toggle('is-on', v);
      Store.saveSettings({ sound: v });
      SFX.setOn(v);
      if (v) SFX.play('log');
    });

    /* напоминание */
    U.on(host, 'click', '#sRemind', function (e, sw) {
      const v = !Store.settings().remindOn;
      sw.classList.toggle('is-on', v);
      Store.saveSettings({ remindOn: v });
      if (v) {
        if (!('Notification' in window)) { UI.warn('Браузер не поддерживает уведомления'); Store.saveSettings({ remindOn: false }); sw.classList.remove('is-on'); }
        else Notification.requestPermission().then(p => {
          if (p !== 'granted') { UI.warn('Разрешение не выдано', 'Уведомления отключены браузером.'); Store.saveSettings({ remindOn: false }); sw.classList.remove('is-on'); }
          else UI.ok('Напоминания включены', 'Будем напоминать в ' + Store.settings().remindTime);
        });
      }
    });
    U.on(host, 'change', '#sTime', function (e) { Store.saveSettings({ remindTime: e.target.value }); });
    U.on(host, 'click', '#sWeighIn button', function (e, b) {
      Store.saveSettings({ weighIn: b.getAttribute('data-w') });
      SFX.play('click');
      App.refresh();
    });

    /* данные */
    U.on(host, 'click', '#dExport', function () {
      U.download('system-backup-' + U.today() + '.json', Store.exportJSON());
      UI.ok('Копия сохранена', 'Файл скачан в папку загрузок.');
    });
    U.on(host, 'click', '#dCsv', function () {
      U.download('system-data-' + U.today() + '.csv', Store.exportCSV(), 'text/csv;charset=utf-8');
      UI.ok('Таблица выгружена', 'Можно открыть в Excel или Google Sheets.');
    });
    U.on(host, 'click', '#dImport', function () {
      U.pickFile('.json').then(function (f) {
        if (!f) return;
        UI.confirm({ title: 'ИМПОРТ ДАННЫХ', text: 'Файл «' + f.name + '» полностью заменит текущие данные. Текущие данные будут потеряны.', ok: 'Импортировать', danger: true })
          .then(function (yes) {
            if (!yes) return;
            try {
              Store.importJSON(f.text);
              UI.ok('Данные импортированы', '');
              App.bootHard();
            } catch (e) { UI.warn('Ошибка импорта', e.message || 'Файл повреждён или неверный'); }
          });
      });
    });
    U.on(host, 'click', '#dClear', function () {
      UI.confirm({ title: 'ОЧИСТИТЬ ЖУРНАЛЫ', text: 'Вес, питание, тренировки, квесты, достижения и опыт будут удалены. Профиль и цели сохранятся.', ok: 'Очистить', danger: true })
        .then(function (yes) { if (yes) { Store.clearData(); UI.ok('Журналы очищены'); App.bootHard(); } });
    });
    U.on(host, 'click', '#dReset', function () {
      UI.confirm({ title: 'ПОЛНЫЙ СБРОС', text: 'Всё будет удалено безвозвратно: профиль, цели и все записи. Экспортируй копию, если данные нужны.', ok: 'Удалить всё', danger: true })
        .then(function (yes) { if (yes) { Store.reset(); location.hash = '#/dashboard'; App.bootHard(); } });
    });
    U.on(host, 'click', '#dDemo', function () {
      UI.confirm({ title: 'ДЕМО-ДАННЫЕ', text: 'В журнал будет добавлено 30 дней правдоподобных записей: вес, замеры, еда, тренировки, вода, шаги.', ok: 'Заполнить' })
        .then(function (yes) { if (yes) { demoData(); UI.ok('Демо-данные загружены', 'Смотри графики и статистику.'); App.bootHard(); } });
    });
  }

  return { render, mount };
})();
