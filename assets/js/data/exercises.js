/* ═══════════════════════════════════════════════════════════
   SYSTEM — exercise database & training plans
   group: muscle group. mode: 'reps' (weight x reps) or 'time'.
   ═══════════════════════════════════════════════════════════ */
window.DB_EX = (function () {

  /* muscles */
  const M = {
    chest:'Грудь', back:'Спина', legs:'Ноги', shoulder:'Плечи',
    arms:'Руки', core:'Пресс', glutes:'Ягодицы', cardio:'Кардио', full:'Всё тело'
  };

  /* exercises */
  const exercises = [
    /* грудь */
    { id:'bench',      name:'Жим штанги лёжа',        g:'chest', mode:'reps' },
    { id:'bench_dumb', name:'Жим гантелей лёжа',      g:'chest', mode:'reps' },
    { id:'bench_incline',name:'Жим гантелей наклон',   g:'chest', mode:'reps' },
    { id:'pushup',     name:'Отжимания',               g:'chest', mode:'reps' },
    { id:'dip',        name:'Отжимания на брусьях',    g:'chest', mode:'reps' },
    { id:'fly',        name:'Разводка гантелей',       g:'chest', mode:'reps' },
    { id:'cable_press',name:'Жим в кроссовере',        g:'chest', mode:'reps' },
    /* спина */
    { id:'deadlift',   name:'Становая тяга',           g:'back', mode:'reps' },
    { id:'pullup',     name:'Подтягивания',            g:'back', mode:'reps' },
    { id:'chinup',     name:'Подтягивания обратным',   g:'back', mode:'reps' },
    { id:'lat_pulldown',name:'Тяга верхнего блока',   g:'back', mode:'reps' },
    { id:'barbell_row',name:'Тяга штанги в наклоне',   g:'back', mode:'reps' },
    { id:'dumb_row',   name:'Тяга гантели в наклоне',  g:'back', mode:'reps' },
    { id:'seated_row', name:'Тяга гантели сидя',       g:'back', mode:'reps' },
    { id:'tbar_row',   name:'Тяга Т-грифа',            g:'back', mode:'reps' },
    /* ноги / ягодицы */
    { id:'squat',      name:'Присед со штангой',       g:'legs', mode:'reps' },
    { id:'goblet',     name:'Гоблет-присед',           g:'legs', mode:'reps' },
    { id:'legpress',   name:'Жим ногами',              g:'legs', mode:'reps' },
    { id:'lunge',      name:'Выпады',                  g:'legs', mode:'reps' },
    { id:'rdl',        name:'Румынская тяга',          g:'glutes',mode:'reps' },
    { id:'hipthrust',  name:'Ягодичный мост',          g:'glutes',mode:'reps' },
    { id:'leg_curl',   name:'Сгибание ног',            g:'legs', mode:'reps' },
    { id:'leg_ext',    name:'Разгибание ног',          g:'legs', mode:'reps' },
    { id:'calf',       name:'Подъём на носки',         g:'legs', mode:'reps' },
    /* плечи */
    { id:'ohp',        name:'Жим стоя',                g:'shoulder', mode:'reps' },
    { id:'db_press',   name:'Жим гантелей сидя',       g:'shoulder', mode:'reps' },
    { id:'lateral',    name:'Махи гантелями в стороны',g:'shoulder', mode:'reps' },
    { id:'rear_delt',  name:'Тяга к подбородку',       g:'shoulder', mode:'reps' },
    { id:'facepull',   name:'Тяга каната',             g:'shoulder', mode:'reps' },
    { id:'shrug',      name:'Плечи трапеция',          g:'shoulder', mode:'reps' },
    /* руки */
    { id:'curl',       name:'Сгибания на бицепс',      g:'arms', mode:'reps' },
    { id:'hammer',     name:'Молотковые сгибания',     g:'arms', mode:'reps' },
    { id:'preacher',   name:'Сгибания на скамье',      g:'arms', mode:'reps' },
    { id:'triceps_push',name:'Жим узким хватом',       g:'arms', mode:'reps' },
    { id:'skull',      name:'Французский жим',         g:'arms', mode:'reps' },
    { id:'triceps_ext',name:'Разгибания на блоке',     g:'arms', mode:'reps' },
    /* пресс */
    { id:'plank',      name:'Планка',                  g:'core', mode:'time' },
    { id:'crunch',     name:'Скручивания',             g:'core', mode:'reps' },
    { id:'leg_raise',  name:'Подъём ног лёжа',         g:'core', mode:'reps' },
    { id:'russian_tw', name:'Скручивания русские',     g:'core', mode:'reps' },
    { id:'hollow',     name:'Hollow hold',             g:'core', mode:'time' },
    { id:'ab_wheel',   name:'Колесо на пресс',         g:'core', mode:'reps' },
    { id:'side_plank', name:'Боковая планка',          g:'core', mode:'time' },
    { id:'mountain',   name:'Альпинист',               g:'core', mode:'time' },
    /* кардио */
    { id:'run',        name:'Бег',                    g:'cardio', mode:'time' },
    { id:'walk',       name:'Ходьба',                  g:'cardio', mode:'time' },
    { id:'cycle',      name:'Велосипед',               g:'cardio', mode:'time' },
    { id:'rower',      name:'Тренажёр гребля',         g:'cardio', mode:'time' },
    { id:'jump_rope',  name:'Скакалка',                g:'cardio', mode:'time' },
    { id:'hiit',       name:'ВИИТ',                    g:'cardio', mode:'time' },
    { id:'elliptical', name:'Эллиптический',           g:'cardio', mode:'time' },
    { id:'stairs',     name:'Ходьба по лестнице',      g:'cardio', mode:'time' }
  ];

  const byId = {};
  exercises.forEach(e => { byId[e.id] = e; });

  /* ── ПЛАНЫ ТРЕНИРОВОК ── */
  const plans = [
    { id:'p_beginner_full', name:'Новичок · Всё тело', type:'beginner', days:3, split:'full',
      desc:'Полное тело 3 раза в неделю. Базовые многосуставные движения.',
      ex:['squat','bench','lat_pulldown','plank'], rest:'2–3 мин' },
    { id:'p_upper_lower', name:'Верх / Низ', type:'split', days:4, split:'upper',
      desc:'Классический сплит: верх и низ через день. Лучший для потери жира.',
      ex:['bench','lat_pulldown','ohp','row','barbell_row','biceps_curl' /* placeholder replaced below */],
      exLow:['squat','rdl','leg_press','lunge','leg_curl','plank'],
      rest:'2 мин' },
    { id:'p_push_pull', name:'Push / Pull / Legs', type:'split', days:6, split:'push',
      desc:'6 дней в неделю, сплит по мышечным группам. Для опытных.',
      ex:['bench','ohp','dumb_row','lat_pulldown','dip','fly'],
      exLow:['squat','legpress','rdl','leg_curl','calf','ab_wheel'],
      rest:'1.5–2 мин' },
    { id:'p_home_gym', name:'Дома / Без инвентаря', type:'home', days:4, split:'full',
      desc:'Домашние тренировки с собственным весом. Минимум места.',
      ex:['pushup','lunge','dip','leg_raise','plank','mountain'],
      rest:'1 мин' },
    { id:'p_hiit_fat', name:'Кардио / Жиросжигание', type:'cardio', days:5, split:'cardio',
      desc:'Высокое время пульса, короткие подходы. 25–40 минут.',
      ex:['hiit','jump_rope','rower','cycle','mountain','run'],
      rest:'0.5–1 мин' },
    { id:'p_walk', name:'Ходьба и активность', type:'recovery', days:7, split:'cardio',
      desc:'Низкоинтенсивные тренировки для ежедневного использования. Шаги — основа.',
      ex:['walk','stairs','stretch_plank' /*placeholder*/].slice(0,2),
      rest:'—' },
    { id:'p_mobility', name:'Мобильность и восстановление', type:'recovery', days:4, split:'core',
      desc:'Растяжка, пресс, дыхание. Снижает риск травм и снимает отёки.',
      ex:['plank','side_plank','hollow','leg_raise','crunch'],
      rest:'1 мин' }
  ];

  /* clean placeholders: rebuild the two plans that used a sentinel */
  plans.find(p => p.id === 'p_upper_lower').ex = ['bench','lat_pulldown','ohp','db_press','barbell_row','triceps_push'];
  plans.find(p => p.id === 'p_walk').ex = ['walk','stairs'];

  /* default set scheme per plan */
  const defaultSets = { beginner:3, split:4, home:3, cardio:1, recovery:3 };

  /* MET values for kcal estimate (kcal ≈ MET * weight(kg) * hours) */
  const MET = { chest:5.0, back:5.5, legs:6.0, shoulder:5.0, arms:4.0, core:4.0,
                glutes:5.5, cardio:8.0, full:6.0 };

  function exName(id){ return byId[id] ? byId[id].name : id; }
  function exGroup(id){ return byId[id] ? byId[id].g : 'full'; }
  function exMode(id){ return byId[id] ? byId[id].mode : 'reps'; }

  return { M, exercises, byId, plans, defaultSets, MET, exName, exGroup, exMode };
})();
