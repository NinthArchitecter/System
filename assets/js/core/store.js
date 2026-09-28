/* ═══════════════════════════════════════════════════════════════
   SYSTEM — store.js
   Состояние, localStorage, начисление XP, серии, квесты, достижения
   ═══════════════════════════════════════════════════════════════ */
window.Store = (function () {
  'use strict';

  const KEY = 'system.solo.v1';
  const VERSION = 1;

  /* ── схема по умолчанию ── */
  function blank() {
    return {
      version: VERSION,
      profile: {
        name: 'Охотник',
        sex: 'male',
        birthDate: '',
        height: 178,
        activity: 1.375,
        units: 'kg',           // kg | lb
        createdAt: U.today()
      },
      goal: {
        mode: 'cut',           // cut | maintain | bulk
        startWeight: null,
        targetWeight: null,
        deadline: '',
        ratePerWeek: 0.7
      },
      settings: {
        sound: true,
        theme: 'azure',
        onboarded: false,
        weighIn: 'morning',    // morning | evening
        remindTime: '08:00',
        remindOn: false
      },
      weight: [],              // {id,date,kg,fat,note}
      body: [],                // {id,date,waist,chest,hip,arm,thigh,neck}
      meals: {},               // 'YYYY-MM-DD': {items:[], water:number, steps:number, sleep:number, mood:string, note:string}
      workouts: [],            // {id,date,name,planId,duration,group,burned,ex:[{id,name,mode,sets:[{kg,reps}]}],note,volume}
      questDone: {},           // 'YYYY-MM-DD': {questId:ts}
      customQuests: [],        // {id,title,metric,target,xp,active}
      ach: {},                 // id: ts
      xpLog: [],               // {ts,amount,reason,icon,date}
      xp: 0,
      meta: { seenQuests: {}, lastSeenDate: '', lastLevel: 1, lastStreak: 0 }
    };
  }

  let S = blank();
  const subs = [];
  let xpGained = 0;          // накоплено XP в текущем «батче»
  let newAch = [];           // новые достижения в этом батче
  let levelUps = [];         // переходы уровней

  /* ── 1. PERSIST ── */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        S = migrate(p);
      }
    } catch (e) { console.warn('SYSTEM: не удалось прочитать сохранение', e); }
    return S;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { console.warn('SYSTEM: не удалось сохранить', e); }
  }
  function migrate(p) {
    const d = blank();
    const out = Object.assign(d, p);
    /* глубокое слияние для вложенных объектов */
    out.profile  = Object.assign(d.profile, p.profile || {});
    out.goal     = Object.assign(d.goal, p.goal || {});
    out.settings = Object.assign(d.settings, p.settings || {});
    out.meta     = Object.assign(d.meta, p.meta || {});
    ['weight','body','workouts','customQuests','xpLog'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
    ['meals','questDone','ach'].forEach(k => { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
    out.xp = U.num(out.xp, 0);
    out.version = VERSION;
    return out;
  }

  /* ── 2. SUBSCRIBE / COMMIT ── */
  function subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
  function emit() { save(); subs.forEach(f => { try { f(S); } catch (e) { console.error(e); } }); }
  /* изменить + сохранить + перерисовать */
  function commit(reason) { emit(); if (reason) { const v = $('#footMsg'); if (v) v.textContent = reason; } }
  function touch() { emit(); }

  /* ── 3. ПРОФИЛЬ / ЦЕЛИ ── */
  function profile() { return S.profile; }
  function goal() { return S.goal; }
  function settings() { return S.settings; }
  /* профиль + режим цели — то, что ждёт C.macroTarget (нужны mode/ratePerWeek) */
  function plan() {
    return Object.assign({}, S.profile, {
      mode: S.goal.mode, ratePerWeek: S.goal.ratePerWeek
    });
  }
  /* норма воды по актуальному весу */
  function waterGoal() {
    return C.waterTarget({ startWeight: currentWeight() || S.profile.startWeight || 78 });
  }

  function saveProfile(patch) { Object.assign(S.profile, patch); commit('Профиль обновлён'); }
  function saveGoal(patch) { Object.assign(S.goal, patch); commit('Цели обновлены'); }
  function saveSettings(patch) { Object.assign(S.settings, patch); commit('Настройки сохранены'); }

  /* автоматический стартовый вес — первая запись */
  function ensureStart() {
    if (S.goal.startWeight === null && S.weight.length) {
      S.goal.startWeight = S.weight[0].kg;
      S.profile.startWeight = S.weight[0].kg;
    }
    if (S.goal.startWeight === null && S.profile.startWeight) {
      S.goal.startWeight = S.profile.startWeight;
    }
  }

  /* ── 4. ВЕС ── */
  function weightAll() { return S.weight.slice().sort((a, b) => a.date < b.date ? -1 : 1); }
  function weightOn(date) { return S.weight.find(w => w.date === date) || null; }
  function currentWeight() {
    const w = weightAll();
    return w.length ? w[w.length - 1].kg : (S.profile.startWeight || null);
  }
  function weightSeries() { return weightAll().map(w => w.kg); }
  function maSeries(win) { return C.movingAvg(weightSeries(), win || 7); }
  function weeklyRate() {
    const s = maSeries(7);
    return s.length >= 4 ? C.trend(s, 7) : null;
  }

  function logWeight(date, kg, fat, note) {
    kg = U.round(U.num(kg, 0), 1);
    if (!kg || kg < 25 || kg > 350) return { ok: false, msg: 'Некорректный вес (25–350 кг)' };
    const d = date || U.today();
    const ex = weightOn(d);
    if (ex) {
      const old = ex.kg;
      ex.kg = kg;
      if (fat !== undefined && fat !== null && fat !== '') ex.fat = U.num(fat, 0);
      if (note !== undefined) ex.note = note;
      const dv = U.round(kg - old, 1);
      commit('Вес за ' + U.fmtDate(d) + ' обновлён');
      return { ok: true, updated: true, delta: dv };
    }
    ensureStart();
    S.weight.push({ id: U.uid(), date: d, kg: kg, fat: fat === '' || fat === undefined ? null : U.num(fat, null), note: note || '' });
    S.weight.sort((a, b) => a.date < b.date ? -1 : 1);
    addXp(C.XP.weight, 'Взвешивание', '⚖️', d);
    awardIf('a_first_weight');
    commit('Запись веса сохранена');
    return { ok: true, added: true };
  }
  function delWeight(id) {
    const i = S.weight.findIndex(w => w.id === id);
    if (i >= 0) { S.weight.splice(i, 1); commit('Запись удалена'); return true; }
    return false;
  }

  /* ── 5. ЗАМЕРЫ ── */
  const BODY_FIELDS = [
    { k:'waist',  n:'Талия',   ph:'см' },
    { k:'chest',  n:'Грудь',   ph:'см' },
    { k:'hip',    n:'Бёдра',   ph:'см' },
    { k:'arm',    n:'Бицепс',  ph:'см' },
    { k:'thigh',  n:'Бедро',   ph:'см' },
    { k:'neck',   n:'Шея',     ph:'см' }
  ];
  function bodyAll() { return S.body.slice().sort((a, b) => a.date < b.date ? -1 : 1); }
  function bodyOn(date) { return S.body.find(b => b.date === date) || null; }
  function latestBody() { const a = bodyAll(); return a.length ? a[a.length - 1] : null; }
  function logBody(date, data) {
    const d = date || U.today();
    let rec = bodyOn(d);
    if (!rec) { rec = { id: U.uid(), date: d }; S.body.push(rec); }
    let filled = 0;
    BODY_FIELDS.forEach(f => {
      if (data[f.k] !== undefined && data[f.k] !== '') { rec[f.k] = U.num(data[f.k], 0); filled++; }
    });
    S.body.sort((a, b) => a.date < b.date ? -1 : 1);
    if (filled) { addXp(C.XP.measure, 'Замеры', '📏', d); awardIf('a_loss_5'); }
    commit('Замеры сохранены');
    return rec;
  }
  function delBody(id) {
    const i = S.body.findIndex(b => b.id === id);
    if (i >= 0) { S.body.splice(i, 1); commit('Замер удалён'); return true; }
    return false;
  }

  /* ── 6. ПИТАНИЕ ── */
  function day(date) {
    const d = date || U.today();
    if (!S.meals[d]) S.meals[d] = { items: [], water: 0, steps: 0, sleep: 0, mood: '', note: '' };
    const m = S.meals[d];
    if (!m.items) m.items = [];
    if (m.water === undefined) m.water = 0;
    if (m.steps === undefined) m.steps = 0;
    if (m.sleep === undefined) m.sleep = 0;
    return m;
  }
  function dayRaw(date) { return S.meals[date || U.today()] || null; }
  function datesWithFood() { return Object.keys(S.meals).filter(k => (S.meals[k].items || []).length).sort(); }

  function addFood(date, mealId, foodId, grams) {
    const f = window.DB_FOOD.byId[foodId];
    if (!f) return null;
    grams = U.clamp(U.num(grams, f.u || 100), 1, 3000);
    const d = day(date);
    const k = grams / 100;
    const item = {
      id: U.uid(), meal: mealId, food: foodId, name: f.name,
      g: U.round(grams, 1),
      kcal: U.round(f.kcal * k, 0),
      p: U.round(f.p * k, 1), f: U.round(f.f * k, 1), c: U.round(f.c * k, 1),
      t: new Date().toTimeString().slice(0, 5)
    };
    d.items.push(item);
    const m = window.DB_FOOD.MEALS.find(x => x.id === mealId);
    addXp(m ? m.xp : 10, f.name, '🍽️', date || U.today());
    awardIf('a_first_meal');
    commit(f.name + ' +' + item.kcal + ' ккал');
    return item;
  }
  function addCustom(date, mealId, o) {
    const d = day(date);
    const g = U.num(o.g, 100), k = g / 100;
    d.items.push({
      id: U.uid(), meal: mealId, food: '', name: (o.name || 'Блюдо').slice(0, 60),
      g: U.round(g, 1),
      kcal: U.round(U.num(o.kcal, 0), 0),
      p: U.round(U.num(o.p, 0), 1), f: U.round(U.num(o.f, 0), 1), c: U.round(U.num(o.c, 0), 1),
      t: new Date().toTimeString().slice(0, 5)
    });
    const m = window.DB_FOOD.MEALS.find(x => x.id === mealId);
    addXp(m ? m.xp : 10, o.name || 'Блюдо', '🍽️', date || U.today());
    awardIf('a_first_meal');
    commit('Блюдо добавлено');
  }
  function addTemplate(date, tplId, mult) {
    const t = window.DB_FOOD.templates.find(x => x.id === tplId);
    if (!t) return;
    const m = mult || 1;
    t.items.forEach(i => addFood(date, t.meal, i.food, i.g * m));
  }
  function delFood(date, itemId) {
    const d = S.meals[date || U.today()];
    if (!d) return;
    const i = d.items.findIndex(x => x.id === itemId);
    if (i >= 0) { d.items.splice(i, 1); commit('Удалено'); }
  }
  function moveFood(date, itemId, mealId) {
    const d = S.meals[date || U.today()];
    if (!d) return;
    const it = d.items.find(x => x.id === itemId);
    if (it) { it.meal = mealId; commit('Перемещено'); }
  }

  function totals(date) {
    const d = dayRaw(date || U.today());
    const t = { kcal:0, p:0, f:0, c:0, water:0, steps:0, sleep:0, items:(d && d.items || []).length, byMeal:{} };
    window.DB_FOOD.MEALS.forEach(m => { t.byMeal[m.id] = { kcal:0, p:0, f:0, c:0, n:0 }; });
    if (d) {
      d.items.forEach(i => {
        t.kcal += i.kcal; t.p += i.p; t.f += i.f; t.c += i.c;
        if (t.byMeal[i.meal]) { const m = t.byMeal[i.meal]; m.kcal += i.kcal; m.p += i.p; m.f += i.f; m.c += i.c; m.n++; }
      });
      t.water = d.water || 0; t.steps = d.steps || 0; t.sleep = d.sleep || 0;
    }
    t.kcal = Math.round(t.kcal);
    t.p = U.round(t.p, 1); t.f = U.round(t.f, 1); t.c = U.round(t.c, 1);
    return t;
  }

  function addWater(date, ml) {
    const d = day(date);
    d.water = U.clamp(U.num(d.water, 0) + ml, 0, 6000);
    const goal = C.waterTarget({ startWeight: currentWeight() || S.profile.startWeight || 78 });
    if (d.water >= goal && (d.water - ml) < goal) addXp(C.XP.water, 'Цель по воде достигнута', '💧', date || U.today());
    checkQuests(date);
    awardIf('a_water_7');
    commit('Вода: ' + d.water + ' мл');
    return d.water;
  }
  function setWater(date, ml) { const d = day(date); d.water = U.clamp(U.num(ml, 0), 0, 6000); checkQuests(date); commit('Вода обновлена'); return d.water; }
  function setSteps(date, n) { const d = day(date); d.steps = U.clamp(U.num(n, 0), 0, 100000); checkQuests(date); commit('Шаги: ' + d.steps); }
  function setSleep(date, h) { const d = day(date); d.sleep = U.clamp(U.num(h, 0), 0, 24); checkQuests(date); commit('Сон: ' + d.sleep + ' ч'); }
  function setMood(date, m) { const d = day(date); d.mood = m; commit('Настроение сохранено'); }
  function setNote(date, n) { const d = day(date); d.note = n; commit('Заметка сохранена'); }

  /* ── 7. ТРЕНИРОВКИ ── */
  function workoutsAll() { return S.workouts.slice().sort((a, b) => a.date < b.date ? 1 : -1); }
  function workoutOn(date) { return S.workouts.filter(w => w.date === (date || U.today())); }
  function workoutKcalOf(w) {
    if (w.burned) return w.burned;
    return C.workoutKcal(w.duration, currentWeight(), w.group || 'full');
  }
  function volumeOf(w) {
    let v = 0;
    (w.ex || []).forEach(e => (e.sets || []).forEach(s => { v += (U.num(s.kg, 0) * U.num(s.reps, 0)); }));
    return Math.round(v);
  }
  function logWorkout(o) {
    const w = {
      id: U.uid(), date: o.date || U.today(), name: o.name || 'Тренировка',
      planId: o.planId || '', duration: U.num(o.duration, 45), group: o.group || 'full',
      ex: (o.ex || []).map(e => ({
        id: e.id || '',
        name: e.name || (window.DB_EX.byId[e.id] ? window.DB_EX.byId[e.id].name : e.id),
        mode: e.mode || 'reps',
        sets: (e.sets || []).map(s => ({ kg: U.num(s.kg, 0), reps: U.num(s.reps, 0), time: U.num(s.time, 0) }))
      })),
      note: o.note || ''
    };
    w.volume = volumeOf(w);
    w.burned = C.workoutKcal(w.duration, currentWeight(), w.group);
    S.workouts.push(w);
    addXp(C.XP.workout, w.name, '⚔️', w.date);
    awardIf('a_first_workout');
    checkQuests(w.date);
    commit(w.name + ' — ' + w.burned + ' ккал');
    return w;
  }
  function delWorkout(id) {
    const i = S.workouts.findIndex(w => w.id === id);
    if (i >= 0) { S.workouts.splice(i, 1); commit('Тренировка удалена'); return true; }
    return false;
  }
  function personalBest(exId) {
    let best = 0;
    S.workouts.forEach(w => (w.ex || []).forEach(e => {
      if (e.id !== exId) return;
      (e.sets || []).forEach(s => { if (U.num(s.kg, 0) > best) best = U.num(s.kg, 0); });
    }));
    return best;
  }
  function lastUsedSets(exId) {
    const ws = workoutsAll();
    for (const w of ws) {
      const e = (w.ex || []).find(x => x.id === exId);
      if (e && e.sets && e.sets.length) return e.sets.slice();
    }
    return null;
  }
  function activePlan() { return S.settings.planId || ''; }
  function setActivePlan(id) { S.settings.planId = id; commit('План тренировок выбран'); }

  /* ── 8. XP ── */
  function addXp(amount, reason, icon, date) {
    amount = Math.round(U.num(amount, 0));
    if (!amount) return;
    const before = C.levelFromXp(S.xp);
    S.xp += amount;
    xpGained += amount;
    const after = C.levelFromXp(S.xp);
    S.xpLog.push({ ts: Date.now(), amount, reason: reason || '', icon: icon || '◆', date: date || U.today() });
    if (S.xpLog.length > 900) S.xpLog = S.xpLog.slice(-900);
    if (after.level > before.level) {
      const nr = C.rank(after.level);
      for (let l = before.level + 1; l <= after.level; l++) {
        levelUps.push({ level: l, rank: C.rank(l) });
      }
      S.meta.lastLevel = after.level;
      awardIf('a_lvl_5'); awardIf('a_lvl_10'); awardIf('a_lvl_20'); awardIf('a_lvl_30'); awardIf('a_lvl_50');
    }
    awardIf('a_xp_10k'); awardIf('a_xp_50k'); awardIf('a_xp_100k');
  }
  function xpOn(date) { return U.sum(S.xpLog.filter(x => x.date === date).map(x => x.amount)); }
  function xpRange(days) {
    const from = U.addDays(U.today(), -(days - 1));
    return S.xpLog.filter(x => x.date >= from);
  }

  /* ── 9. СЕРИИ (streak) ── */
  /* День считается «активным», если выполнено хотя бы одно из:
     взвешивание, тренировка, запись еды ≥ 3 позиций, отметка квеста      */
  function dayActive(date) {
    if (weightOn(date)) return true;
    if (S.workouts.some(w => w.date === date)) return true;
    const t = totals(date);
    if (t.items >= 3) return true;
    const q = S.questDone[date];
    if (q && Object.keys(q).length >= 2) return true;
    return false;
  }
  function streak() {
    let n = 0;
    let d = U.today();
    if (!dayActive(d)) d = U.addDays(d, -1);   // серия жива, пока сегодня не начата
    let guard = 0;
    while (dayActive(d) && guard < 2000) { n++; d = U.addDays(d, -1); guard++; }
    return n;
  }
  function bestStreak() {
    const set = {};
    Object.keys(S.meals).forEach(d => { if (dayActive(d)) set[d] = 1; });
    S.weight.forEach(w => { set[w.date] = 1; });
    S.workouts.forEach(w => { set[w.date] = 1; });
    const ds = Object.keys(set).sort();
    let best = 0, cur = 0, prev = null;
    ds.forEach(d => {
      cur = (prev && U.diffDays(prev, d) === 1) ? cur + 1 : 1;
      prev = d; if (cur > best) best = cur;
    });
    return best;
  }
  function checkStreakReward() {
    const s = streak();
    const tiers = Object.keys(C.XP.streak).map(Number).sort((a, b) => a - b);
    for (const t of tiers) {
      if (s >= t && S.meta.lastStreak < t) {
        addXp(C.XP.streak[t], 'Серия ' + t + ' дн.', '🔥');
        S.meta.lastStreak = t;
      }
    }
  }

  /* ── 10. КВЕСТЫ ── */
  function dailyQuests(date) {
    const d = date || U.today();
    const core = window.DB_QUESTS.rollDaily(U.parseISO(d).getTime() / 86400000 | 0);
    const custom = S.customQuests.filter(q => q.active !== false);
    return core.concat(custom.map(q => ({ id: q.id, title: q.title, desc: q.desc || '',
      metric: q.metric, target: q.target || 1, xp: q.xp || 20, emoji: q.emoji || '◆', custom: true })));
  }
  function questDone(date, id) { const q = S.questDone[date]; return !!(q && q[id]); }
  function questProgress(metric, date) {
    const d = date || U.today();
    const t = totals(d);
    const m = C.macroTarget(plan(), currentWeight());
    switch (metric) {
      case 'weightLogged': return weightOn(d) ? 1 : 0;
      case 'waterGoal':    return t.water >= waterGoal() ? 1 : 0;
      case 'workoutDone':  return S.workouts.some(w => w.date === d) ? 1 : 0;
      case 'mealsAll':     return ['breakfast','lunch','dinner','snack'].filter(x => (t.byMeal[x] || {}).n > 0).length;
      case 'kcalInGoal':   return t.items > 0 ? (t.kcal <= m.kcal ? 1 : 0) : 0;
      case 'proteinGoal':  return t.p >= m.protein ? 1 : 0;
      case 'stepsGoal':    return t.steps >= 10000 ? 1 : 0;
      case 'sleepOk':      return t.sleep >= 7.5 ? 1 : 0;
      case 'sugarOk': {
        const bad = ['candy','sugar','cola','honey','sour_cream','ice_cream','chips','juice_apple','juice_orange','cookie','pancake','vodka','beer'];
        const items = (dayRaw(d) || {}).items || [];
        return items.length === 0 ? 0 : (items.some(i => bad.indexOf(i.food) >= 0) ? 0 : 1);
      }
      case 'measured':     return bodyOn(d) ? 1 : 0;
      case 'snackOk':      return (t.byMeal.snack || {}).n === 0 ? 1 : 0;
      case 'stretchDone':  return (S.workouts.filter(w => w.date === d).some(w => w.group === 'core' || w.group === 'cardio')) ? 1 : 0;
      case 'waterLiters':  return Math.min(1, t.water / 2000);
      case 'calm':         return 1;   // ручной квест
      default: return 0;
    }
  }
  function completeQuest(date, id) {
    const d = date || U.today();
    if (questDone(d, id)) return false;
    const list = dailyQuests(d);
    const q = list.find(x => x.id === id);
    if (!q) return false;
    if (!S.questDone[d]) S.questDone[d] = {};
    S.questDone[d][id] = Date.now();
    addXp(q.xp, q.title, q.emoji || '◆', d);
    checkDayComplete(d);
    commit('Квест выполнен: ' + q.title);
    return true;
  }
  function uncompleteQuest(date, id) {
    const d = date || U.today();
    if (S.questDone[d]) { delete S.questDone[d][id]; commit('Отметка снята'); }
  }
  function addCustomQuest(o) {
    S.customQuests.push({
      id: 'c_' + U.uid(), title: o.title, desc: o.desc || '',
      metric: o.metric || 'calm', target: U.num(o.target, 1),
      xp: U.num(o.xp, 20), emoji: o.emoji || '◆', active: true
    });
    commit('Квест создан');
  }
  function delCustomQuest(id) {
    const i = S.customQuests.findIndex(q => q.id === id);
    if (i >= 0) { S.customQuests.splice(i, 1); commit('Квест удалён'); }
  }
  /* автозакрытие квестов, выполненных неявно */
  function checkQuests(date) {
    const d = date || U.today();
    let changed = false;
    dailyQuests(d).forEach(q => {
      if (questDone(d, q.id)) return;
      const need = q.target || 1;
      if (questProgress(q.metric, d) >= need) {
        if (!S.questDone[d]) S.questDone[d] = {};
        S.questDone[d][q.id] = Date.now();
        addXp(q.xp, q.title, q.emoji || '◆', d);
        changed = true;
      }
    });
    if (changed) { checkDayComplete(d); commit('Квесты закрыты автоматически'); }
  }

  /* Идеальный день: все дневные цели выполнены */
  function dayGoals(d) {
    d = d || U.today();
    const t = totals(d);
    const m = C.macroTarget(plan(), currentWeight());
    return {
      weight: !!weightOn(d),
      kcal: t.items > 0 && t.kcal <= m.kcal,
      protein: t.p >= m.protein,
      water: t.water >= waterGoal(),
      workout: S.workouts.some(w => w.date === d)
    };
  }
  function dayScore(d) {
    const g = dayGoals(d);
    const keys = Object.keys(g);
    return Math.round(keys.filter(k => g[k]).length / keys.length * 100);
  }
  function isPerfectDay(d) {
    const g = dayGoals(d);
    return Object.keys(g).filter(k => g[k]).length >= 4;
  }
  function checkDayComplete(d) {
    if (isPerfectDay(d)) {
      const key = 'perfect_' + d;
      if (!S.meta[key]) {
        S.meta[key] = 1;
        addXp(C.XP.perfectDay, 'Идеальный день', '💠', d);
      }
    }
  }
  function perfectDays() {
    return Object.keys(S.meta).filter(k => k.indexOf('perfect_') === 0).length;
  }

  /* ── 11. ДОСТИЖЕНИЯ ── */
  function stats() {
    const w = weightAll();
    const cur = currentWeight();
    const start = S.goal.startWeight;
    const lost = (start && cur) ? U.round(start - cur, 1) : 0;
    const kcals = window.DB_FOOD;
    let proteinDays = 0, kcalDays = 0, waterDays = 0, mealsLogged = 0;
    const m = C.macroTarget(plan(), cur);
    Object.keys(S.meals).forEach(d => {
      const t = totals(d);
      if (!t.items) return;
      mealsLogged += t.items;
      if (t.p >= m.protein) proteinDays++;
      if (t.kcal <= m.kcal) kcalDays++;
      if (t.water >= waterGoal()) waterDays++;
    });
    const totalVolume = U.sum(S.workouts.map(w => volumeOf(w)));
    const bestSteps = U.max(0, U.max(Object.keys(S.meals).map(d => S.meals[d].steps || 0)));
    const b = C.bmi(cur, S.profile.height);
    return {
      level: C.levelFromXp(S.xp).level,
      totalXp: S.xp,
      currentWeight: cur,
      startWeight: start,
      targetWeight: S.goal.targetWeight,
      totalLost: lost,
      lostPct: (start && cur && start > 0) ? round2(lost / start * 100) : 0,
      bmi: b,
      weightLogs: S.weight.length,
      workouts: S.workouts.length,
      mealsLogged: mealsLogged,
      totalVolume: totalVolume,
      bestSteps: bestSteps,
      bestStreak: bestStreak(),
      streak: streak(),
      proteinDays: proteinDays, kcalDays: kcalDays, waterDays: waterDays,
      perfectDays: perfectDays(),
      goalReached: !!(S.goal.targetWeight && cur && cur <= S.goal.targetWeight)
    };
  }
  function round2(v) { return Math.round(v * 10) / 10; }

  function awardIf(id) {
    if (S.ach[id]) return false;
    const a = window.DB_QUESTS.achievements.find(x => x.id === id);
    if (!a) return false;
    let s;
    try { s = stats(); } catch (e) { return false; }
    if (!a.check(s)) return false;
    S.ach[id] = Date.now();
    newAch.push(a);
    return true;
  }
  function checkAllAchievements() { window.DB_QUESTS.achievements.forEach(a => awardIf(a.id)); }
  function achList() {
    return window.DB_QUESTS.achievements.map(a => ({ a: a, got: S.ach[a.id] ? U.relTime(S.ach[a.id]) : null }));
  }
  function achCount() {
    return { got: Object.keys(S.ach).length, all: window.DB_QUESTS.achievements.length };
  }

  /* ── 12. ПРИЗЫВЫ (уведомления) ── */
  function notifications() {
    const n = [];
    const d = U.today();
    const t = totals(d);
    const m = C.macroTarget(plan(), currentWeight());
    const g = dayGoals(d);
    if (!g.weight) n.push({ ic:'⚖️', t:'Взвесься утром', d:'Это самый точный замер за день', go:'#/weight', key:'w' });
    if (g.water) n.push({ ic:'💧', t:'Допить воду', d:'Осталось ' + Math.max(0, waterGoal() - t.water) + ' мл', go:'#/nutrition', key:'h' });
    if (!g.kcal && t.items) n.push({ ic:'🔥', t:'Калории выше цели', d: t.kcal + ' / ' + m.kcal + ' ккал', go:'#/nutrition', key:'k' });
    if (!g.protein && t.items) n.push({ ic:'🥩', t:'Добавь белок', d: Math.round(m.protein - t.p) + ' г до нормы', go:'#/nutrition', key:'p' });
    if (!g.workout) n.push({ ic:'⚔️', t:'Нет тренировки', d:'Даже 20 минут лучше нуля', go:'#/training', key:'w' });
    const r = weeklyRate();
    if (r !== null && S.goal.mode === 'cut' && r > -0.1) n.push({ ic:'⚠️', t:'Плато замедляется', d:'Тренд ' + U.signed(r, 2) + ' кг/нед', go:'#/progress', key:'t' });
    return n;
  }

  /* ── 13. ЭКСПОРТ / ИМПОРТ / СБРОС ── */
  function exportJSON() { return JSON.stringify(S, null, 2); }
  function exportCSV() {
    let out = 'date,weight_kg,fat_pct,waist_cm,chest_cm,hip_cm,arm_cm,thigh_cm,steps,sleep_h,kcal_intake,kcal_target,protein_g,fat_g,carbs_g,water_ml,trained\n';
    const all = {};
    Object.keys(S.meals).forEach(d => all[d] = 1);
    S.weight.forEach(w => all[w.date] = 1);
    S.body.forEach(b => all[b.date] = 1);
    S.workouts.forEach(w => all[w.date] = 1);
    Object.keys(all).sort().forEach(d => {
      const t = totals(d);
      const m = C.macroTarget(plan(), currentWeight());
      const w = weightOn(d) || {}, b = bodyOn(d) || {};
      out += [d, w.kg || '', w.fat || '', b.waist || '', b.chest || '', b.hip || '', b.arm || '', b.thigh || '',
        t.steps, t.sleep, t.kcal, m.kcal, t.p, t.f, t.c, t.water,
        S.workouts.some(x => x.date === d) ? 1 : 0].join(',') + '\n';
    });
    return out;
  }
  function importJSON(text) {
    const p = JSON.parse(text);
    if (!p || typeof p !== 'object' || !p.profile) throw new Error('Неверный формат файла');
    S = migrate(p);
    emit();
    return true;
  }
  function reset(keepProfile) {
    const pr = keepProfile ? { profile: S.profile, goal: S.goal, settings: S.settings } : null;
    S = blank();
    if (pr) { S.profile = pr.profile; S.goal = pr.goal; S.settings = pr.settings; S.settings.onboarded = true; }
    emit();
  }
  function clearData() {  // очистить журналы, оставив профиль
    const p = S.profile, g = S.goal, st = S.settings;
    S = blank();
    S.profile = p; S.goal = g; S.settings = st; S.settings.onboarded = true;
    emit();
  }

  /* ── 14. БАТЧ-Уведомления ── */
  function takeBatch() {
    const b = { xp: xpGained, ach: newAch.slice(), levels: levelUps.slice() };
    xpGained = 0; newAch = []; levelUps = [];
    return b;
  }

  /* ── 15. СБОРНЫЙ СНИМОК ДЛЯ ОТРИСОВКИ ── */
  function snapshot() {
    const cur = currentWeight();
    const m = C.macroTarget(plan(), cur);
    const l = C.levelFromXp(S.xp);
    return {
      state: S, profile: S.profile, goal: S.goal, settings: S.settings,
      today: U.today(),
      weight: cur, series: weightSeries(), ma: maSeries(7),
      start: S.goal.startWeight, target: S.goal.targetWeight,
      progress: C.fmtProgress(cur, S.goal.startWeight, S.goal.targetWeight),
      rate: weeklyRate(),
      eta: C.eta(cur, S.goal.targetWeight, weeklyRate()),
      level: l, rank: C.rank(l.level), nextRank: C.nextRank(l.level),
      macros: m, kcalGoal: m.kcal, proteinGoal: m.protein, fatGoal: m.fat, carbsGoal: m.carbs,
      waterGoal: waterGoal(),
      totals: totals(U.today()),
      streak: streak(), bestStreak: bestStreak(),
      bmi: C.bmi(cur, S.profile.height), bmiCat: C.bmiCat(C.bmi(cur, S.profile.height)),
      healthy: healthyRange(),
      stats: stats(),
      quests: dailyQuests(U.today()),
      doneToday: S.questDone[U.today()] || {},
      goals: dayGoals(U.today()),
      score: dayScore(U.today()),
      achCount: achCount()
    };
  }
  function healthyRange() {
    const hw = C.healthyWeight(S.profile.startWeight || currentWeight(), S.profile.height);
    const cur = currentWeight();
    let pos = 0;
    if (hw && cur) {
      const span = Math.max(0.1, hw.max - hw.min);
      pos = U.clamp((cur - hw.min) / span * 100, 0, 100);
    }
    return { min: hw ? hw.min : 0, max: hw ? hw.max : 0, pos: pos };
  }

  return {
    state: () => S, load, save, migrate, subscribe, emit, commit, touch,
    profile, goal, settings, plan, waterGoal, saveProfile, saveGoal, saveSettings, ensureStart,
    weightAll, weightOn, currentWeight, weightSeries, maSeries, weeklyRate, logWeight, delWeight,
    BODY_FIELDS, bodyAll, bodyOn, latestBody, logBody, delBody,
    day, dayRaw, datesWithFood, addFood, addCustom, addTemplate, delFood, moveFood, totals,
    addWater, setWater, setSteps, setSleep, setMood, setNote,
    workoutsAll, workoutOn, logWorkout, delWorkout, volumeOf, workoutKcalOf,
    personalBest, lastUsedSets, activePlan, setActivePlan,
    addXp, xpOn, xpRange,
    dayActive, streak, bestStreak, checkStreakReward,
    dailyQuests, questDone, questProgress, completeQuest, uncompleteQuest,
    addCustomQuest, delCustomQuest, checkQuests, dayGoals, dayScore, isPerfectDay, checkDayComplete, perfectDays,
    stats, awardIf, checkAllAchievements, achList, achCount,
    notifications, exportJSON, exportCSV, importJSON, reset, clearData,
    takeBatch, snapshot, healthyRange
  };
})();
