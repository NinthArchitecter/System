/* ═══════════════════════════════════════════════════════════════
   SYSTEM — views/nutrition.js  ·  ПИТАНИЕ, МАКРОСЫ, ВОДА
   ═══════════════════════════════════════════════════════════════ */
window.Views = window.Views || {};

Views.nutrition = (function () {
  'use strict';
  const $ = U.$, $$ = U.$$;
  let curDate = null;
  let curMeal = 'breakfast';
  let searchTerm = '';

  function date() { return curDate || U.today(); }

  /* ── ДОБАВИТЬ ЕДУ: выбор блюда из базы ── */
  function addModal(mealId, foodId) {
    curMeal = mealId || curMeal;
    const F = window.DB_FOOD;
    const d = date();
    const t = Store.totals(d);
    const m = C.macroTarget(Store.plan(), Store.currentWeight());
    const left = Math.max(0, m.kcal - t.kcal);
    const pLeft = Math.max(0, m.protein - t.p);

    UI.modal({
      title: 'ДОБАВИТЬ В «' + (F.MEALS.find(x => x.id === curMeal) || {}).name.toUpperCase() + '» · ' + U.fmtDateFull(d).toUpperCase(),
      html:
        '<div class="row row--between mb2">' +
          '<div class="food-search" style="flex:1">' +
            '<input class="inp" id="fSearch" placeholder="Поиск: курица, овсянка, творог…" autocomplete="off">' +
            '<div class="food-results" id="fResults"></div>' +
          '</div>' +
          '<div class="seg" id="fMeal">' + F.MEALS.map(m2 =>
            '<button data-m="' + m2.id + '" class="' + (m2.id === curMeal ? 'is-on' : '') + '">' + m2.icon + '</button>').join('') + '</div>' +
        '</div>' +

        '<div class="row row--between mb2 t-xs">' +
          '<span class="t-mute">Осталось: <b class="t-hud" style="color:var(--ac-lt)">' + U.fmtNum(left) + '</b> ккал · белка <b class="t-hud">' + Math.round(pLeft) + '</b> г</span>' +
          '<button class="btn btn--ghost btn--xs" id="fCustom">Своё блюдо</button>' +
        '</div>' +

        '<div class="lbl mb1">Готовые шаблоны</div>' +
        '<div class="tpl" id="fTpl" style="max-height:150px;overflow-y:auto">' +
          F.templates.map(function (t) {
            const byId = {};
            F.list.forEach(f => byId[f.id] = f);
            const p = U.sum(t.items.map(i => byId[i.food] ? byId[i.food].p * i.g / 100 : 0));
            return '<button class="tpl__b" data-tpl="' + t.id + '"><b>' + t.name + '</b>' +
              '<span class="mac">' + Math.round(t.kcal) + ' ккал · Б ' + Math.round(p) + ' г</span></button>';
          }).join('') +
        '</div>' +

        '<div class="hr"></div>' +
        '<div class="lbl mb1">Выбранное блюдо</div>' +
        '<div id="fPick">' + U.empty('flame', 'Ничего не выбрано', 'Найди продукт в поиске или возьми шаблон выше.') + '</div>',

      onMount: function (b) {
        const search = U.$('#fSearch', b), results = U.$('#fResults', b), pick = U.$('#fPick', b);

        function showPick(f) {
          if (!f) { pick.innerHTML = U.empty('flame', 'Ничего не выбрано', 'Найди продукт в поиске или возьми шаблон выше.'); return; }
          const g = f.u || 100;
          pick.innerHTML =
            '<div class="row" style="align-items:center;gap:12px">' +
              '<div style="width:44px;height:44px;display:grid;place-items:center;border-radius:11px;font-size:20px;background:rgba(90,140,255,.12);border:1px solid var(--line-hi)">' + (F.CATS[f.cat] || '🍽️') + '</div>' +
              '<div style="flex:1;min-width:0"><b style="font-size:15px">' + U.esc(f.name) + '</b>' +
                '<div class="t-xs t-mute">' + Math.round(f.kcal) + ' ккал / 100 г · Б ' + f.p + ' · Ж ' + f.f + ' · У ' + f.c + '</div></div>' +
            '</div>' +
            '<div class="row mt2" style="align-items:flex-end">' +
              '<div class="field" style="width:150px"><label>Количество, г</label>' +
                '<input class="inp inp--num" id="fG" type="number" step="' + (f.step || 5) + '" min="1" max="3000" value="' + g + '"></div>' +
              '<button class="chip" data-quick="' + g + '">порция ' + (f.q || g + ' г') + '</button>' +
              '<span class="spacer"></span>' +
              '<div class="t-right"><div class="lbl">Итого</div>' +
                '<b class="t-hud" id="fKcal" style="font-size:20px;color:var(--ac-lt)">' + Math.round(f.kcal * g / 100) + ' ккал</b></div>' +
            '</div>' +
            '<div class="t-xs t-mute mt1" id="fMac"></div>' +
            '<div class="modal__foot">' +
              '<button class="btn btn--ghost btn--sm" data-close>Отмена</button>' +
              '<button class="btn btn--sm" id="fAdd">Добавить</button></div>';

          const gi = U.$('#fG', b);
          function calc() {
            const gg = U.clamp(U.num(gi.value, 0), 0, 3000), k = gg / 100;
            U.$('#fKcal', b).textContent = Math.round(f.kcal * k) + ' ккал';
            U.$('#fMac', b).textContent = 'Б ' + U.round(f.p * k, 1) + ' г · Ж ' + U.round(f.f * k, 1) + ' г · У ' + U.round(f.c * k, 1) + ' г';
          }
          calc();
          gi.addEventListener('input', calc);
          $$('[data-quick]', pick).forEach(q => q.addEventListener('click', function () { gi.value = this.getAttribute('data-quick'); calc(); }));
          U.$('#fAdd', b).addEventListener('click', function () {
            Store.addFood(d, curMeal, f.id, gi.value);
            SFX.play('add');
            UI.xpAlert((F.MEALS.find(x => x.id === curMeal) || { xp: 10 }).xp, f.name);
            UI.closeModal();
            App.afterAction();
          });
        }

        function doSearch() {
          const q = search.value.trim().toLowerCase();
          searchTerm = q;
          if (!q) { results.innerHTML = ''; return; }
          const found = F.list.filter(f => f.name.toLowerCase().indexOf(q) >= 0 || f.cat.indexOf(q) >= 0).slice(0, 40);
          results.innerHTML = found.length ? found.map(f =>
            '<div class="food-res" data-f="' + f.id + '">' +
              '<span style="width:20px">' + (F.CATS[f.cat] || '🍽️') + '</span>' +
              '<b>' + U.esc(f.name) + '</b>' +
              '<span class="mac">Б' + f.p + ' Ж' + f.f + ' У' + f.c + '</span>' +
              '<span class="kcal">' + Math.round(f.kcal) + '</span></div>').join('')
            : '<div class="food-res"><b class="t-mute">Ничего не найдено</b></div>';
        }
        search.addEventListener('input', U.debounce(doSearch, 130));
        search.addEventListener('focus', doSearch);
        results.addEventListener('click', function (e) {
          const r = e.target.closest('[data-f]');
          if (!r) return;
          showPick(F.byId[r.getAttribute('data-f')]);
          results.innerHTML = '';
        });
        /* клик по шаблону */
        U.on(U.$('#fTpl', b), 'click', '[data-tpl]', function (e, btn) {
          const id = btn.getAttribute('data-tpl');
          const t = F.templates.find(x => x.id === id);
          Store.addTemplate(d, id);
          curMeal = t.meal;
          SFX.play('add');
          UI.ok(t.name, 'Шаблон добавлен: ' + Math.round(t.kcal) + ' ккал · +' + (F.MEALS.find(x => x.id === t.meal) || { xp: 10 }).xp * t.items.length + ' XP');
          UI.closeModal();
          App.afterAction();
        });
        /* смена приёма пищи */
        U.on(U.$('#fMeal', b), 'click', 'button', function (e, btn) {
          curMeal = btn.getAttribute('data-m');
          $$('#fMeal button', b).forEach(x => x.classList.remove('is-on'));
          btn.classList.add('is-on');
        });
        /* своё блюдо */
        U.$('#fCustom', b).addEventListener('click', function () { customModal(d, curMeal); });
        if (foodId) showPick(F.byId[foodId]);
      }
    });
  }

  /* ── СВОЁ БЛЮДО ── */
  function customModal(d, meal) {
    UI.modal({
      title: 'СВОЁ БЛЮДО',
      html:
        '<div class="form-grid">' +
          '<div class="field" style="grid-column:1/-1"><label>Название</label><input class="inp" id="cName" placeholder="Домашний салат"></div>' +
          '<div class="field"><label>Вес, г</label><input class="inp inp--num" id="cG" type="number" value="100" step="5"></div>' +
          '<div class="field"><label>Калории</label><input class="inp inp--num" id="cK" type="number" value="0" step="5"></div>' +
          '<div class="field"><label>Белок, г</label><input class="inp inp--num" id="cP" type="number" value="0" step="0.5"></div>' +
          '<div class="field"><label>Жиры, г</label><input class="inp inp--num" id="cF" type="number" value="0" step="0.5"></div>' +
          '<div class="field"><label>Углеводы, г</label><input class="inp inp--num" id="cC" type="number" value="0" step="0.5"></div>' +
        '</div>' +
        '<p class="t-xs t-mute mt1">Калории и макросы считайте на указанный вес. Помощь: 1 ст.л. масла ≈ 135 ккал, 100 г куриной грудки ≈ 113 ккал / Б 24.</p>' +
        '<div class="modal__foot"><button class="btn btn--ghost btn--sm" data-close>Отмена</button>' +
        '<button class="btn btn--sm" id="cOk">Добавить</button></div>',
      onMount: function (b) {
        U.$('#cName', b).focus();
        U.$('#cOk', b).addEventListener('click', function () {
          const name = U.$('#cName', b).value.trim();
          if (!name) { UI.warn('Нужно название'); return; }
          Store.addCustom(d, meal, {
            name: name, g: U.$('#cG', b).value, kcal: U.$('#cK', b).value,
            p: U.$('#cP', b).value, f: U.$('#cF', b).value, c: U.$('#cC', b).value
          });
          SFX.play('add');
          UI.closeModal();
          App.afterAction();
        });
      }
    });
  }

  /* ── ПРИЁМ ПИЩИ ── */
  function mealBlock(s, m) {
    const b = s.totals.byMeal[m.id] || { kcal: 0, p: 0, f: 0, c: 0, n: 0 };
    const raw = (Store.dayRaw(date()) || { items: [] });
    const items = raw.items.filter(i => i.meal === m.id);
    const rows = items.length ? items.map(function (i) {
      return '<div class="li" data-item="' + i.id + '">' +
        '<div class="li__ico">' + (F_CAT(i.food)) + '</div>' +
        '<div class="li__b"><b>' + U.esc(i.name) + '</b>' +
          '<span>' + U.fmtKg(i.g, 0) + ' г · Б' + U.round(i.p, 1) + ' Ж' + U.round(i.f, 1) + ' У' + U.round(i.c, 1) + (i.t ? ' · ' + i.t : '') + '</span></div>' +
        '<div class="li__r"><b>' + i.kcal + '</b><span>ккал</span></div>' +
        '<button class="iconbtn" data-del="' + i.id + '" style="width:28px;height:28px"><i class="ico" data-ico="close" style="width:14px;height:14px"></i></button>' +
        '</div>';
    }).join('') : '<div class="t-xs t-mute" style="padding:10px 8px">Пока пусто. Нажми «Добавить».</div>';

    const pct = s.macros.kcal ? U.clamp(b.kcal / (s.macros.kcal / 4) * 100, 0, 100) : 0;
    return '<div class="meal">' +
      '<div class="meal__head"><span style="color:var(--ac-lt);font-size:16px">' + m.icon + '</span>' +
        '<b>' + m.name + '</b>' +
        '<span class="t-xs t-mute">' + Math.round(pct) + '% от нормы</span>' +
        '<span class="kcal">' + b.kcal + ' ккал</span>' +
        '<button class="btn btn--ghost btn--xs" data-add="' + m.id + '"><i class="ico" data-ico="plus" style="width:13px;height:13px"></i>Добавить</button>' +
      '</div>' +
      '<div class="meal__body">' + rows + '</div></div>';
  }
  function F_CAT(foodId) {
    const f = window.DB_FOOD.byId[foodId];
    return f ? (window.DB_FOOD.CATS[f.cat] || '🍽️') : '🍽️';
  }

  /* ── ВОДА ── */
  function waterBlock(s) {
    const t = s.totals;
    const goal = s.waterGoal;
    const cups = 8, per = Math.round(goal / cups);
    const filled = t.water / per;
    let cupsHtml = '';
    for (let i = 0; i < cups; i++) {
      const f = U.clamp(filled - i, 0, 1) * 100;
      cupsHtml += '<div style="text-align:center"><div class="cup" data-cup="' + i + '" style="--f:' + f + '%"></div>' +
        '<div class="cup-lbl">' + (i + 1) * per + '</div></div>';
    }
    return '<div class="panel"><div class="panel__head"><h3>Вода</h3><span class="grow"></span>' +
      '<span class="tag ' + (t.water >= goal ? 'tag--green' : '') + '">' + t.water + ' / ' + goal + ' мл</span></div>' +
      '<div class="panel__body">' +
        '<div class="water">' + cupsHtml + '</div>' +
        '<div class="row mt2">' +
          [100, 250, 500].map(v => '<button class="btn btn--ghost btn--sm" data-water="' + v + '">+' + v + ' мл</button>').join('') +
          '<span class="spacer"></span>' +
          '<button class="btn btn--ghost btn--sm" data-water="-250">−250</button>' +
          '<button class="btn btn--ghost btn--sm" id="wReset">Сброс</button>' +
        '</div>' +
        '<div class="bar mt2"><i style="width:' + U.clamp(t.water / goal * 100, 0, 100) + '%;background:linear-gradient(90deg,#0a6ea8,#25e0f5)"></i></div>' +
        '<p class="t-xs t-mute mt1">Норма рассчитана как 30 мл на кг веса. Поддержание воды ускоряет расщепление жира и снижает аппетит.</p>' +
      '</div></div>';
  }

  /* ── КАЛОРИЙНЫЙ ДИАЛЕТ + МАКРОСЫ ── */
  function dialBlock(s) {
    const t = s.totals, m = s.macros;
    const remain = m.kcal - t.kcal;
    return '<div class="panel"><div class="panel__head"><h3>Энергия дня</h3><span class="grow"></span>' +
      '<span class="tag">' + (Store.goal().mode === 'cut'
        ? 'дефицит ' + Math.round((C.tdee(Store.profile(), s.weight) - m.kcal))
        : Store.goal().mode === 'bulk'
          ? 'профицит ' + Math.round((m.kcal - C.tdee(Store.profile(), s.weight)))
          : 'поддержание') + '</span></div>' +
      '<div class="panel__body"><div class="g2" style="align-items:center">' +
        UI.lineKcal(178, t.kcal, m.kcal) +
        '<div>' +
          '<div class="stat-line"><span>Съедено</span><b>' + U.fmtNum(t.kcal) + ' ккал</b></div>' +
          '<div class="stat-line"><span>Норма</span><b>' + U.fmtNum(m.kcal) + ' ккал</b></div>' +
          '<div class="stat-line"><span>' + (remain >= 0 ? 'Осталось' : 'Перебор') + '</span>' +
            '<b class="' + (remain >= 0 ? 'up' : 'down') + '">' + U.fmtNum(Math.abs(remain)) + ' ккал</b></div>' +
          '<div class="stat-line"><span>Базовый обмен (BMR)</span><b>' + U.fmtNum(C.bmr(Store.profile(), s.weight)) + '</b></div>' +
          '<div class="stat-line"><span>С учётом активности</span><b>' + U.fmtNum(C.tdee(Store.profile(), s.weight)) + '</b></div>' +
          '<hr class="hr hr--dash">' +
          '<div class="macro-bars">' +
            UI.macroBar('Белок', '🥩', '#ff8a3d', t.p, m.protein) +
            UI.macroBar('Жиры', '🥑', '#ffc542', t.f, m.fat) +
            UI.macroBar('Углеводы', '🍚', '#2f7bff', t.c, m.carbs) +
          '</div>' +
        '</div>' +
      '</div></div></div>';
  }

  /* ── ПРОЧИЕ ДНЕВНЫЕ ДАННЫЕ ── */
  function extrasBlock(s) {
    const t = s.totals;
    return '<div class="grid g2">' +
      '<div class="tile"><div class="tile__ico" style="color:#93a2cc">👣</div>' +
        '<div class="tile__lbl">Шаги</div>' +
        '<div class="tile__val">' + U.fmtNum(t.steps) + '</div>' +
        '<div class="bar mt1"><i style="width:' + U.clamp(t.steps / 10000 * 100, 0, 100) + '%;background:linear-gradient(90deg,#4c1d95,#a78bfa)"></i></div>' +
        '<div class="row mt2"><button class="btn btn--ghost btn--xs" data-steps="1000">+1000</button>' +
        '<button class="btn btn--ghost btn--xs" data-steps="5000">+5000</button>' +
        '<button class="btn btn--ghost btn--xs" id="sSteps">Задать</button></div></div>' +
      '<div class="tile"><div class="tile__ico" style="color:#93a2cc">🌙</div>' +
        '<div class="tile__lbl">Сон</div>' +
        '<div class="tile__val">' + (t.sleep || 0) + '<em>ч</em></div>' +
        '<div class="bar mt1"><i style="width:' + U.clamp(t.sleep / 8 * 100, 0, 100) + '%;background:linear-gradient(90deg,#4c1d95,#c4b5fd)"></i></div>' +
        '<div class="row mt2"><button class="btn btn--ghost btn--xs" data-sleep="7">7ч</button>' +
        '<button class="btn btn--ghost btn--xs" data-sleep="8">8ч</button>' +
        '<button class="btn btn--ghost btn--xs" data-sleep="9">9ч</button></div></div>' +
      '</div>';
  }

  /* ── ИСТОРИЯ КАЛОРИЙ ── */
  function historyBlock(s) {
    const n = 21, days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = U.addDays(s.today, -i);
      const t = Store.totals(d);
      days.push({ label: U.parseISO(d).getDate(), y: t.kcal, title: U.fmtDateFull(d),
        color: t.kcal === 0 ? 'rgba(120,150,220,.2)' : t.kcal > s.macros.kcal ? '#ff3b62' : '#2f7bff',
        tip: [['калории', t.kcal + ' ккал', t.kcal > s.macros.kcal ? '#ff3b62' : '#2f7bff'],
              ['белок', Math.round(t.p) + ' г', '#ff8a3d'],
              ['жиры', Math.round(t.f) + ' г', '#ffc542'],
              ['углеводы', Math.round(t.c) + ' г', '#2f7bff']] });
    }
    const inRange = days.filter(x => x.y > 0 && x.y <= s.macros.kcal).length;
    const logged = days.filter(x => x.y > 0).length;
    return '<div class="panel"><div class="panel__head"><h3>Калории за 3 недели</h3><span class="grow"></span>' +
      '<span class="tag ' + (inRange >= logged * 0.7 ? 'tag--green' : 'tag--gold') + '">в норме ' + inRange + ' из ' + logged + ' дн</span></div>' +
      '<div class="panel__body"><div id="kChart"></div></div></div>';
  }

  /* ── ПРАВИЛА ПИТАНИЯ ── */
  function tips(s) {
    const m = s.macros;
    return '<div class="panel"><div class="panel__head"><h3>Что делать с этим</h3></div><div class="panel__body">' +
      '<ul class="brief" style="padding:0;background:none;border:0">' +
        '<li>Белок <b>' + m.protein + ' г</b> (' + m.pPerKg + ' г/кг) — сохраняет мышцы на дефиците, лучшая отдача на единицу усилий.</li>' +
        '<li>Углеводы — вокруг тренировки. Днём, когда тренируешься, они работают лучше.</li>' +
        '<li>Вода <b>' + s.waterGoal + ' мл</b>: голод часто маскирует жажду. Стакан перед едой убирает 100–150 ккал.</li>' +
        '<li>Вес утром падает на 0,5–1,5 кг за счёт воды и остатков еды. Это норма, не повод паниковать.</li>' +
        '<li>Сахар и алкоголь — минимум. Калорийность напитков самая коварная и незаметная.</li>' +
      '</ul></div></div>';
  }

  /* ── НАВИГАЦИЯ ПО ДНЯМ ── */
  function dayNav(s) {
    const d = date();
    const isToday = d === U.today();
    return '<div class="row" style="gap:8px">' +
      '<button class="iconbtn" id="dPrev" title="Предыдущий день"><i class="ico" data-ico="down" style="transform:rotate(90deg)"></i></button>' +
      '<div class="t-center" style="min-width:170px">' +
        '<b class="t-hud" style="font-size:13px">' + U.fmtDateFull(d) + '</b>' +
        '<div class="t-xs t-mute">' + (isToday ? 'сегодня' : U.agoLabel(d)) + '</div></div>' +
      '<button class="iconbtn" id="dNext" title="Следующий день"' + (isToday ? ' disabled style="opacity:.3"' : '') + '>' +
        '<i class="ico" data-ico="down" style="transform:rotate(-90deg)"></i></button>' +
      (isToday ? '' : '<button class="btn btn--ghost btn--xs" id="dToday">Сегодня</button>') +
    '</div>';
  }

  /* ── RENDER ── */
  function render(host) {
    const s = Store.snapshot();
    const F = window.DB_FOOD;
    const t = s.totals;
    host.innerHTML =
      '<div class="phead"><div class="phead__t">' +
        '<h1>Питание</h1>' +
        '<p>Дневник приёмов пищи, макросы и гидратация. Норма рассчитана под твою цель по формуле Миффлина–Сан Жеора.</p>' +
      '</div><div class="row">' + dayNav(s) +
        '<button class="btn btn--sm" id="nAddBtn"><i class="ico" data-ico="plus"></i>Добавить</button>' +
      '</div></div>' +

      dialBlock(s) +

      '<div class="grid g-2-1 mt3">' +
        '<div class="stack">' +
          '<div class="panel"><div class="panel__head"><h3>Приёмы пищи</h3><span class="grow"></span>' +
            '<span class="tag">' + t.items + ' ' + U.plural(t.items, 'позиция', 'позиции', 'позиций') + '</span></div>' +
            '<div class="panel__body"><div class="stack" style="gap:11px">' +
              F.MEALS.map(m => mealBlock(s, m)).join('') +
            '</div></div></div>' +
          historyBlock(s) +
        '</div>' +
        '<div class="stack">' +
          waterBlock(s) +
          extrasBlock(s) +
          tips(s) +
        '</div>' +
      '</div>';
  }

  /* ── MOUNT ── */
  function mount(host) {
    const s = Store.snapshot();
    const kc = U.$('#kChart', host);
    if (kc) {
      const days = [];
      for (let i = 20; i >= 0; i--) {
        const d = U.addDays(s.today, -i);
        const t = Store.totals(d);
        days.push({ label: U.parseISO(d).getDate(), y: t.kcal, title: U.fmtDateFull(d),
          color: t.kcal === 0 ? 'rgba(120,150,220,.2)' : t.kcal > s.macros.kcal ? '#ff3b62' : '#2f7bff',
          tip: [['калории', t.kcal + ' ккал', t.kcal > s.macros.kcal ? '#ff3b62' : '#2f7bff'],
                ['белок', Math.round(t.p) + ' г', '#ff8a3d']] });
      }
      Chart.bars(kc, { height: 180, goal: s.macros.kcal, data: days });
    }

    U.on(host, 'click', '#nAddBtn', () => addModal(curMeal));
    U.on(host, 'click', '[data-add]', function (e, b) { addModal(b.getAttribute('data-add')); });
    U.on(host, 'click', '[data-del]', function (e, b) {
      e.stopPropagation();
      Store.delFood(date(), b.getAttribute('data-del'));
      SFX.play('del');
      App.afterAction();
    });
    U.on(host, 'click', '[data-water]', function (e, b) {
      Store.addWater(date(), U.num(b.getAttribute('data-water'), 0));
      SFX.play('tick');
      App.afterAction();
    });
    U.on(host, 'click', '#wReset', function () { Store.setWater(date(), 0); App.afterAction(); });
    U.on(host, 'click', '[data-steps]', function (e, b) {
      Store.setSteps(date(), s.totals.steps + U.num(b.getAttribute('data-steps'), 0));
      App.afterAction();
    });
    U.on(host, 'click', '#sSteps', function () {
      UI.modal({ title: 'ШАГИ ЗА ДЕНЬ', html:
        '<div class="field"><label>Количество шагов</label><input class="inp inp--num" id="stV" type="number" value="' + s.totals.steps + '" step="500"></div>' +
        '<div class="modal__foot"><button class="btn btn--ghost btn--sm" data-close>Отмена</button><button class="btn btn--sm" id="stOk">Сохранить</button></div>',
        onMount: function (b) {
          U.$('#stOk', b).addEventListener('click', function () {
            Store.setSteps(date(), U.$('#stV', b).value); UI.closeModal(); App.afterAction();
          });
        }
      });
    });
    U.on(host, 'click', '[data-sleep]', function (e, b) {
      Store.setSleep(date(), b.getAttribute('data-sleep')); App.afterAction();
    });
    U.on(host, 'click', '#dPrev', function () { curDate = U.addDays(date(), -1); App.refresh(); });
    U.on(host, 'click', '#dNext', function () { if (date() !== U.today()) { curDate = U.addDays(date(), 1); App.refresh(); } });
    U.on(host, 'click', '#dToday', function () { curDate = null; App.refresh(); });
    U.on(host, 'click', '.cup', function (e, c) {
      const i = U.num(c.getAttribute('data-cup'), 0);
      const per = Math.round(s.waterGoal / 8);
      const t = s.totals.water;
      Store.setWater(date(), (i + 1) * per > t ? (i + 1) * per : i * per);
      SFX.play('tick');
      App.afterAction();
    });
  }

  return { render, mount, addModal, date: date, reset: function () { curDate = null; } };
})();
