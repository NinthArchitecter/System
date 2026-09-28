/* ═══════════════════════════════════════════════════════════
   SYSTEM — quest definitions
   metric keys are resolved by Store.questProgress(metric, date)
   ═══════════════════════════════════════════════════════════ */
window.DB_QUESTS = (function () {

  /* ── Пул ежедневных квестов (3 случайных + гарантированные) ── */
  const pool = [
    { id:'q_weight',     title:'Взвеситься утром',        desc:'Запись веса после пробуждения',        metric:'weightLogged', xp:20, emoji:'⚖️' },
    { id:'q_kcal',       title:'Дневная норма калорий',    desc:'Не превысить свою цель',                 metric:'kcalInGoal',   xp:25, emoji:'🔥' },
    { id:'q_protein',    title:'Белок на месте',          desc:'Добить норму белка',                     metric:'proteinGoal',  xp:25, emoji:'🥩' },
    { id:'q_all_meals',  title:'Все приёмы пищи внесены', desc:'4 из 4 приёмов пищи',                   metric:'mealsAll',     xp:30, emoji:'🍽️' },
    { id:'q_water',      title:'Вода',                    desc:'',                                     metric:'waterGoal',    xp:20, emoji:'💧', noGoal:true },
    { id:'q_workout',    title:'Тренировка',              desc:'Любая тренировка в зале или дома',       metric:'workoutDone',  xp:50, emoji:'⚔️' },
    { id:'q_steps',      title:'10 000 шагов',            desc:'',                                     metric:'stepsGoal',    xp:20, emoji:'👣', noGoal:true },
    { id:'q_sleep',      title:'Сон 8 часов',             desc:'Ляг спать до 23:00',                    metric:'sleepOk',      xp:15, emoji:'🌙' },
    { id:'q_no_sugar',   title:'Без сахара',              desc:'Нет сладкого и соков',                  metric:'sugarOk',      xp:20, emoji:'🚫' },
    { id:'q_measure',    title:'Замеры',                  desc:'Талия, бёдра, вес — раз в неделю',      metric:'measured',     xp:25, emoji:'📏' },
    { id:'q_no_snack',   title:'Чистый день',            desc:'Без перекусов вне плана',               metric:'snackOk',      xp:20, emoji:'⚡' },
    { id:'q_mobility',   title:'Разминка / растяжка',     desc:'10 минут мобильности',                  metric:'stretchDone',  xp:15, emoji:'🧘' }
  ];

  /* ── Достижения ── */
  const achievements = [
    /* старт */
    { id:'a_first_weight',  name:'Пробуждение',      desc:'Первая запись веса',              icon:'⚖️', check:s=>s.stats.weightLogs>=1 },
    { id:'a_first_workout', name:'Первый удар',      desc:'Первая тренировка',              icon:'⚔️', check:s=>s.stats.workouts>=1 },
    { id:'a_first_meal',    name:'Первый приём пищи',desc:'Внеси первую еду',               icon:'🍽️', check:s=>s.stats.mealsLogged>=1 },

    /* дисциплина */
    { id:'a_streak_3',   name:'Искра',        desc:'3 дня подряд',          icon:'🔥', check:s=>s.stats.bestStreak>=3 },
    { id:'a_streak_7',   name:'Неделя',       desc:'7 дней подряд',         icon:'🗓️', check:s=>s.stats.bestStreak>=7 },
    { id:'a_streak_30',  name:'Месяц стали',  desc:'30 дней подряд',        icon:'⛓️', check:s=>s.stats.bestStreak>=30 },
    { id:'a_streak_100', name:'Сто дней',     desc:'100 дней подряд',       icon:'💎', check:s=>s.stats.bestStreak>=100 },
    { id:'a_days_50',    name:'50 записей',   desc:'50 взвешиваний',        icon:'📒', check:s=>s.stats.weightLogs>=50 },

    /* прогресс */
    { id:'a_loss_5',   name:'Первые 5 кг',  desc:'-5 кг от старта',       icon:'⬇️', check:s=>s.stats.totalLost>=5 },
    { id:'a_loss_10',  name:'Десятка',      desc:'-10 кг от старта',      icon:'📉', check:s=>s.stats.totalLost>=10 },
    { id:'a_loss_20',  name:'Двадцатка',    desc:'-20 кг от старта',      icon:'🏔️', check:s=>s.stats.totalLost>=20 },
    { id:'a_loss_pct_10', name:'10% тела',   desc:'-10% массы тела',       icon:'🎯', check:s=>s.stats.lostPct>=10 },
    { id:'a_goal',     name:'Цель достигнута', desc:'Вес ≤ целевого',     icon:'🏆', check:s=>s.stats.goalReached },
    { id:'a_bmi',      name:'Нормальный ИМТ', desc:'ИМТ < 25',            icon:'⚖️', check:s=>s.stats.bmi>0 && s.stats.bmi<25 },

    /* тренировки */
    { id:'a_workouts_10', name:'Разминка разогнана', desc:'10 тренировок',     icon:'🏋️', check:s=>s.stats.workouts>=10 },
    { id:'a_workouts_50', name:'Сорок девять',       desc:'50 тренировок',     icon:'💪', check:s=>s.stats.workouts>=50 },
    { id:'a_volume_50k',  name:'Полмиллиона',        desc:'50 000 кг объёма',  icon:'🏋️', check:s=>s.stats.totalVolume>=50000 },
    { id:'a_steps_day',   name:'Шаг в сон',         desc:'10 000 шагов за день',icon:'👣', check:s=>s.stats.bestSteps>=10000 },

    /* питание */
    { id:'a_meals_100', name:'Сто записей',  desc:'100 блюд в дневнике',  icon:'📖', check:s=>s.stats.mealsLogged>=100 },
    { id:'a_protein_7',  name:'Белок недели', desc:'7 дней нормы белка',   icon:'🥚', check:s=>s.stats.proteinDays>=7 },
    { id:'a_kcal_30',    name:'Калорийный контроль', desc:'30 дней в калоре', icon:'🎯', check:s=>s.stats.kcalDays>=30 },
    { id:'a_water_7',    name:'Гидратация',   desc:'7 дней нормы воды',    icon:'💧', check:s=>s.stats.waterDays>=7 },

    /* уровни */
    { id:'a_lvl_5',   name:'Ранг D',    desc:'5 уровень',  icon:'📗', check:s=>s.stats.level>=5 },
    { id:'a_lvl_10',  name:'Ранг C',    desc:'10 уровень', icon:'📘', check:s=>s.stats.level>=10 },
    { id:'a_lvl_20',  name:'Ранг A',    desc:'20 уровень', icon:'📙', check:s=>s.stats.level>=20 },
    { id:'a_lvl_30',  name:'Ранг S',    desc:'30 уровень', icon:'📕', check:s=>s.stats.level>=30 },
    { id:'a_lvl_50',  name:'Тень',      desc:'50 уровень', icon:'👁️', check:s=>s.stats.level>=50 },
    { id:'a_xp_10k',  name:'10 000 XP', desc:'Всего 10k опыта',    icon:'⭐', check:s=>s.stats.totalXp>=10000 },
    { id:'a_xp_50k',  name:'50 000 XP', desc:'Всего 50k опыта',    icon:'🌟', check:s=>s.stats.totalXp>=50000 },
    { id:'a_xp_100k', name:'100 000 XP',desc:'Всего 100k опыта',   icon:'✨', check:s=>s.stats.totalXp>=100000 },
    { id:'a_perfect_day', name:'Идеальный день', desc:'Все цели дня выполнены', icon:'💠', check:s=>s.stats.perfectDays>=1 },
    { id:'a_perfect_week',name:'Идеальная неделя', desc:'7 идеальных дней', icon:'👑', check:s=>s.stats.perfectDays>=7 }
  ];

  const xp = id => { const q = pool.find(x=>x.id===id); return q ? q.xp : 20; };

  /* гарантированные (не могут выпасть все сразу): 3 из пула + всегда базовые */
  const CORE = ['q_weight','q_kcal','q_water'];

  function rollDaily(seed) {
    const rest = pool.filter(q => CORE.indexOf(q.id) === -1);
    const picks = [];
    const used = {};
    /* детерминированный shuffle по seed (день) — квесты стабильны в течение суток */
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const bag = rest.slice();
    for (let i = 0; i < 3 && bag.length; i++) {
      const i2 = Math.floor(rnd() * bag.length);
      picks.push(bag.splice(i2,1)[0]);
    }
    return CORE.map(id => pool.find(q=>q.id===id)).concat(picks).filter(Boolean);
  }

  return { pool, achievements, rollDaily, xp };
})();
