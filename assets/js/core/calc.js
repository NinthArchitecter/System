/* ═══════════════════════════════════════════
   SYSTEM — calc.js  (уровни, XP, метаболизм, макросы, масса тела)
   ═══════════════════════════════════════════ */
window.C = (function () {
  'use strict';

  /* ── 1. УРОВНИ И XP ──────────────────────────────────────────
     xpNeeded(n) — опыт для перехода n → n+1.
     Рост квадратичный: каждый уровень дороже предыдущего.       */
  function xpNeeded(level) {
    level = Math.max(1, level | 0);
    return Math.round(80 + 34 * Math.pow(level - 1, 1.55));
  }
  /* сколько XP всего нужно на уровень n (кумулятивно) */
  function xpTotal(level) {
    let t = 0;
    for (let i = 1; i < level; i++) t += xpNeeded(i);
    return t;
  }
  function levelFromXp(xp) {
    let lvl = 1, rem = Math.max(0, xp | 0);
    while (rem >= xpNeeded(lvl) && lvl < 999) { rem -= xpNeeded(lvl); lvl++; }
    return { level: lvl, cur: rem, need: xpNeeded(lvl), pct: clamp(rem / xpNeeded(lvl) * 100, 0, 100) };
  }

  /* ── 2. РАНГИ (Solo Leveling) ── */
  const RANKS = [
    { min:1,  key:'E',    name:'Ранг E' },
    { min:5,  key:'D',    name:'Ранг D' },
    { min:10, key:'C',    name:'Ранг C' },
    { min:16, key:'B',    name:'Ранг B' },
    { min:23, key:'A',    name:'Ранг A' },
    { min:31, key:'S',    name:'Ранг S' },
    { min:40, key:'SS',   name:'Ранг SS' },
    { min:50, key:'SSS',  name:'Ранг SSS' },
    { min:65, key:'SH',   name:'Тень' },
    { min:85, key:'MON',  name:'Монарх' }
  ];
  function rank(level) {
    let r = RANKS[0];
    for (const x of RANKS) if (level >= x.min) r = x;
    return r;
  }
  const nextRank = level => RANKS.find(x => x.min > level) || null;

  /* ── 3. ТАБЛИЦА XP НАГРАД ── */
  const XP = {
    weight:      20,
    meal:       15,
    water:      10,   // за полный литр сверх нормы
    workout:    60,
    quest:      0,   // берётся из квеста
    measure:    25,
    completeDay:40,
    perfectDay: 75,
    streak:     { 3: 50, 7: 120, 14: 260, 30: 600, 60: 1200, 100: 2500 }
  };

  /* ── 4. МЕТАБОЛИЗМ ──
     Mifflin-St Jeor:
       муж:  10*вес + 6.25*рост - 5*возраст + 5
       жен:  10*вес + 6.25*рост - 5*возраст - 161
     + коэффициент активности = TDEE                            */
  const ACTIVITY = [
    { v:1.2,   k:'Сидячий',        desc:'сидячая работа, почти без нагрузки' },
    { v:1.375, k:'Лёгкий',         desc:'1–3 тренировки в неделю' },
    { v:1.55,  k:'Средний',        desc:'3–5 тренировок в неделю' },
    { v:1.725, k:'Высокий',        desc:'6–7 тренировок в неделю' },
    { v:1.9,   k:'Очень высокий',  desc:'физическая работа, 2 тренировки в день' }
  ];

  function age(profile) {
    if (profile.birthDate) {
      const b = U.parseISO(profile.birthDate);
      if (b) {
        const n = new Date();
        let a = n.getFullYear() - b.getFullYear();
        const m = n.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
        return U.clamp(a, 12, 100);
      }
    }
    return 30;
  }

  function bmr(p, weightKg) {
    const w = weightKg || p.startWeight || 80;
    const h = p.height || 175, a = age(p);
    return Math.round(p.sex === 'female'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5);
  }

  function tdee(p, weightKg) {
    return Math.round(bmr(p, weightKg) * (p.activity || 1.375));
  }

  /* Калорийность цели.
     1 кг жира ≈ 7700 ккал; недельная скорость rate → дневной дефицит = rate*7700/7 */
  function calorieTarget(p, weightKg) {
    const t = tdee(p, weightKg);
    const rate = p.ratePerWeek === undefined ? 0.7 : p.ratePerWeek; // кг в неделю
    let kcal = t;
    if (p.mode === 'cut')      kcal = t - Math.round(rate * 7700 / 7);
    else if (p.mode === 'bulk') kcal = t + Math.round(rate * 7700 / 7);
    return U.clamp(kcal, p.sex === 'female' ? 1200 : 1400, 4500);
  }

  function macroTarget(p, weightKg) {
    const kcal = calorieTarget(p, weightKg);
    const w = weightKg || p.startWeight || 80;
    const cut = p.mode === 'cut';

    let pPerKg = cut ? 2.0 : p.mode === 'bulk' ? 1.9 : 1.8;   // г белка на кг
    if (p.sex === 'female') pPerKg = cut ? 1.8 : 1.6;
    if (p.mode === 'cut' && w > 110) pPerKg = 1.9;            // при большом весе — меньше

    const protein = Math.round(w * pPerKg);
    const fat    = Math.round(p.sex === 'female' ? w * (cut ? 0.8 : 0.9)
                                                   : w * (cut ? 0.9 : 1.0));
    const carbs  = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal, protein, fat, carbs, pPerKg, fPerKg: round(fat / w, 2) };
  }

  function waterTarget(p) {
    const base = 30;                                  // мл на кг
    return Math.round((p.startWeight || 78) * base / 50) * 50;   // кратно 50
  }

  /* ── 5. ИМТ / ИМТ-пояс / ИМТ-коэффициент ── */
  function bmi(kg, cm) {
    if (!kg || !cm) return 0;
    const m = cm / 100;
    return round(kg / (m * m), 1);
  }
  function bmiCat(b) {
    if (!b) return { key:'—', label:'Нет данных', cls:'' };
    if (b < 16)  return { key:'16', label:'Истощение',    cls:'bad' };
    if (b < 18.5)return { key:'16', label:'Дефицит массы', cls:'warn' };
    if (b < 25)  return { key:'25', label:'Норма',         cls:'good' };
    if (b < 30)  return { key:'30', label:'Избыточная',    cls:'warn' };
    if (b < 35)  return { key:'35', label:'Ожирение I',    cls:'bad' };
    if (b < 40)  return { key:'40', label:'Ожирение II',   cls:'bad' };
    return { key:'40', label:'Ожирение III', cls:'bad' };
  }
  /* позиция ИМТ на шкале 15..40 */
  function bmiPos(b) { return U.clamp((b - 15) / (40 - 15) * 100, 0, 100); }

  /* Насколько здоров вес: идеальный диапазон BMI 18.5–24.9 */
  function healthyWeight(kg, cm) {
    if (!cm) return null;
    const m = cm / 100;
    return { min: round(18.5 * m * m, 1), max: round(24.9 * m * m, 1) };
  }

  /* ── 6. СКОЛЬЗЯЩЕЕ СРЕДНЕЕ (Happy Scale) ── */
  function movingAvg(arr, win) {
    win = win || 7;
    return arr.map((_, i) => {
      const from = Math.max(0, i - win + 1);
      const slice = arr.slice(from, i + 1);
      return U.round(U.avg(slice), 2);
    });
  }
  /* взвешенный тренд (линейная регрессия по последним N) */
  function trend(arr, n) {
    n = n || 7;
    const s = arr.slice(-n);
    if (s.length < 2) return 0;
    const N = s.length;
    const mx = (N - 1) / 2, my = U.avg(s);
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) { num += (i - mx) * (s[i] - my); den += (i - mx) * (i - mx); }
    return round(num / den * 7, 2);   // кг в неделю
  }

  /* ── 7. Калории тренировки (MET) ── */
  function workoutKcal(durationMin, weightKg, group) {
    const met = (window.DB_EX && window.DB_EX.MET[group]) || 6.0;
    return Math.round(met * (weightKg || 80) * (durationMin / 60));
  }

  /* ── 8. Расход/запас за день ── */
  function dayBalance(o) {
    // o: {tdee, intake, burned}
    return Math.round(o.tdee + (o.burned || 0) - o.intake);
  }

  /* прогноз даты достижения цели (линейно по тренду) */
  function eta(curW, targetW, weeklyRate) {
    if (weeklyRate === null || weeklyRate === undefined || weeklyRate >= -0.02) return null;
    if (!curW || !targetW) return null;
    if (targetW >= curW) return null;
    const weeks = (curW - targetW) / Math.abs(weeklyRate);
    if (weeks > 200) return null;
    return U.addDays(U.today(), Math.round(weeks * 7));
  }

  function fmtProgress(curW, startW, targetW) {
    if (!curW || !startW || !targetW) return 0;
    if (startW === targetW) return 0;
    return U.clamp((startW - curW) / (startW - targetW) * 100, 0, 100);
  }

  const clamp = U.clamp;

  return { xpNeeded, xpTotal, levelFromXp, rank, nextRank, RANKS, XP, ACTIVITY, age, bmr, tdee,
           calorieTarget, macroTarget, waterTarget, bmi, bmiCat, bmiPos, healthyWeight,
           movingAvg, trend, workoutKcal, dayBalance, eta, fmtProgress };
})();