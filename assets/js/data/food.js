/* ═══════════════════════════════════════════════════════════
   SYSTEM — food database
   Values per 100 g (kcal / protein / fat / carbs).
   "u" = base unit weight in grams, "q" = quick portion label.
   Sources: standard RU nutrition tables (Скурихин / USDA mix).
   ═══════════════════════════════════════════════════════════ */
window.DB_FOOD = (function () {
  const F = (id, name, kcal, p, f, c, cat, opt) => Object.assign(
    { id, name, kcal, p, f, c, cat }, opt || {}
  );

  const list = [
    /* ── МЯСО / ПТИЦА (сырое) ── */
    F('chicken_breast','Куриная грудка',113,23.6,1.9,0.4,'meat',{u:150,q:'150 г'}),
    F('chicken_thigh','Куриное бедро',161,18.8,9.0,0,'meat'),
    F('chicken_wing','Крыло куриное',186,17.0,13.0,0,'meat'),
    F('chicken_roast','Курица запечённая',190,26.0,9.0,1.0,'meat'),
    F('turkey','Филе индейки',135,29.0,1.0,0,'meat'),
    F('beef','Говядина 10%',170,26.0,7.0,0,'meat'),
    F('beef_lean','Говядина 5%',150,28.0,4.0,0,'meat'),
    F('pork','Свинина',250,17.0,20.0,0,'meat'),
    F('pork_lean','Свинина постная',198,22.0,12.0,0,'meat'),
    F('lamb','Баранина',282,16.0,24.0,0,'meat'),
    F('rabbit','Крольчатина',173,21.0,10.0,0,'meat'),
    F('liver','Печень говяжья',190,26.0,5.0,7.0,'meat',{u:120}),
    F('mince_beef','Фарш говяжий 5%',166,18.0,10.0,0,'meat'),

    /* ── РЫБА / МОРЕПРОДУКТЫ ── */
    F('salmon','Лосось',208,20.0,13.0,0,'fish'),
    F('tuna','Тунец',109,24.0,0.5,0,'fish'),
    F('cod','Треска',82,17.8,0.7,0,'fish'),
    F('hake','Хек',92,17.9,1.3,0,'fish'),
    F('seabass','Судак',97,18.5,0.9,0,'fish'),
    F('mackerel','Скумбрия',191,19.0,13.0,0,'fish'),
    F('herring','Сельдь',208,17.8,10.4,0,'fish'),
    F('tilapia','Тилапия',96,20.0,1.5,0,'fish'),
    F('shrimp','Креветки',99,24.0,0.3,0.2,'fish'),
    F('calamari','Кальмар',92,16.0,1.1,0,'fish'),
    F('crab','Крабовое мясо',90,18.0,1.2,1.5,'fish'),
    F('red_caviar','Икра красная',200,32.0,0.7,0,'fish',{u:30,q:'30 г'}),
    F('surimi','Сурими',95,15.0,1.5,7.0,'fish'),

    /* ── ЯЙЦА / МОЛОЧНОЕ ── */
    F('egg','Яйцо куриное',157,12.7,10.9,0.7,'dairy',{u:50,q:'1 шт',step:1,max:10}),
    F('egg_white','Белок яичный',48,10.9,0.2,0.7,'dairy',{u:33,q:'1 белок'}),
    F('milk_25','Молоко 2.5%',60,2.9,2.5,4.7,'dairy',{u:250,q:'250 мл'}),
    F('milk_0','Молоко 0%',33,3.2,0.1,4.8,'dairy',{u:250,q:'250 мл'}),
    F('kefir','Кефир 2.5%',51,2.9,2.5,3.9,'dairy',{u:250,q:'250 мл'}),
    F('cottage_5','Творог 5%',145,17.0,5.0,3.0,'dairy',{u:200,q:'200 г'}),
    F('cottage_0','Творог 0%',71,17.0,0.3,3.0,'dairy',{u:200,q:'200 г'}),
    F('cottage_9','Творог 9%',180,17.0,9.0,2.5,'dairy'),
    F('cheese','Сыр твёрдый',366,25.0,27.0,1.3,'dairy',{u:30,q:'30 г',step:10}),
    F('mozzarella','Моцарелла',280,28.0,17.0,3.0,'dairy'),
    F('yogurt_greek','Йогурт греческий',73,9.5,2.0,4.0,'dairy',{u:150,q:'150 г'}),
    F('yogurt','Йогурт питьевой',60,3.5,2.0,6.5,'dairy',{u:200,q:'200 г'}),
    F('sour_cream','Сметана 15%',180,2.5,16.0,2.5,'dairy',{u:30,q:'30 г',step:10}),
    F('butter','Масло сливочное',724,0.8,82.0,0.8,'dairy',{u:15,q:'15 г',step:5,max:50}),
    F('olive_oil','Масло олив.',899,0,99.9,0,'fat',{u:15,q:'15 г',step:5,max:50}),

    /* ── БОБОВЫЕ / КРУПЫ / ТЕСТО ── */
    F('buckwheat','Гречка',329,12.1,3.3,62.0,'grain',{u:200,q:'200 г (сухая)'}),
    F('rice','Рис белый',344,6.7,0.7,78.0,'grain',{u:200,q:'200 г (сухой)'}),
    F('oats','Овсяные хлопья',377,12.3,6.2,62.0,'grain',{u:60,q:'60 г'}),
    F('bulgur','Булгур',342,12.0,1.3,75.0,'grain'),
    F('quinoa','Киноа',368,14.1,6.1,64.2,'grain'),
    F('pasta','Макароны',344,10.4,1.1,71.0,'grain',{u:100,q:'100 г (сухие)'}),
    F('bread_rye','Хлеб ржаной',210,6.6,1.2,41.0,'grain',{u:30,q:'1 кусок',step:10}),
    F('bread_white','Хлеб белый',242,8.1,1.0,48.8,'grain',{u:25,q:'1 кусок',step:5}),
    F('bread_whole','Хлеб цельнозерновой',247,13.0,3.4,41.0,'grain',{u:30,q:'1 кусок',step:10}),
    F('lentil','Чечевица',116,9.0,0.4,20.1,'grain'),
    F('chickpea','Нут',164,8.9,2.6,27.4,'grain'),
    F('corn','Кукуруза вареная',86,3.3,1.4,19.0,'grain',{u:150,q:'150 г'}),

    /* ── ОВОЩИ ── */
    F('cucumber','Огурец',15,0.8,0.1,2.8,'veg',{u:100,q:'100 г'}),
    F('tomato','Помидор',20,0.9,0.2,3.9,'veg',{u:120,q:'1 шт'}),
    F('cucumber_p','Огурец солёный',11,0.8,0.1,1.7,'veg'),
    F('cabbage','Капуста',28,1.8,0.2,5.8,'veg'),
    F('broccoli','Брокколи',34,2.8,0.4,6.6,'veg',{u:150,q:'150 г'}),
    F('cauliflower','Цветная капуста',25,1.9,0.3,5.0,'veg'),
    F('spinach','Шпинат',22,2.9,0.4,3.6,'veg'),
    F('lettuce','Салат лист',20,1.4,0.2,2.9,'veg',{u:80,q:'80 г'}),
    F('carrot','Морковь',35,1.3,0.1,6.9,'veg'),
    F('beet','Свёкла',43,1.5,0.1,10.0,'veg'),
    F('pepper','Перец болгарский',31,1.0,0.3,6.0,'veg',{u:120,q:'1 шт'}),
    F('zucchini','Кабачок',24,0.6,0.3,4.6,'veg'),
    F('eggplant','Баклажан',25,1.0,0.2,5.9,'veg'),
    F('onion','Лук репчатый',41,1.4,0.2,8.2,'veg'),
    F('garlic','Чеснок',143,6.5,0.5,29.9,'veg',{u:5,q:'зубчик',step:1,max:10}),
    F('mushroom','Шампиньоны',27,4.3,1.0,1.0,'veg'),
    F('potato','Картофель',77,2.0,0.4,17.0,'veg',{u:150,q:'150 г'}),
    F('pumpkin','Тыква',22,0.8,0.1,4.7,'veg'),
    F('greens','Зелень (укроп)',32,2.5,0.5,4.1,'veg',{u:15,q:'15 г',step:5}),
    F('asparagus','Спаржа',20,2.2,0.2,3.9,'veg'),
    F('quinoa_c','Киноа варёная',120,4.4,1.9,21.3,'grain'),

    /* ── ФРУКТЫ / ЯГОДЫ ── */
    F('apple','Яблоко',47,0.4,0.4,9.8,'fruit',{u:150,q:'1 среднее'}),
    F('banana','Банан',89,1.1,0.3,22.8,'fruit',{u:120,q:'1 средний'}),
    F('orange','Апельсин',47,0.9,0.1,9.4,'fruit',{u:150,q:'1 средний'}),
    F('grape','Виноград',69,0.7,0.2,18.1,'fruit',{u:120,q:'горсть'}),
    F('pear','Груша',47,0.4,0.2,10.3,'fruit',{u:150,q:'1 средняя'}),
    F('watermelon','Арбуз',30,0.6,0.2,7.6,'fruit',{u:300,q:'300 г'}),
    F('melon','Дыня',34,0.6,0.2,8.1,'fruit',{u:300,q:'300 г'}),
    F('strawberry','Клубника',41,0.7,0.3,7.7,'fruit',{u:150,q:'150 г'}),
    F('blueberry','Черника',57,0.7,0.3,14.5,'fruit',{u:100,q:'100 г'}),
    F('kiwi','Киви',61,1.1,0.5,14.5,'fruit',{u:80,q:'1 шт'}),
    F('mango','Манго',60,0.8,0.4,15.0,'fruit'),
    F('avocado','Авокадо',160,2.0,14.7,8.5,'fruit',{u:100,q:'100 г'}),
    F('lemon','Лимон',29,1.1,0.3,6.2,'fruit'),
    F('date','Финик',277,2.0,0.2,75.0,'fruit',{u:20,q:'1 шт',step:1,max:8}),
    F('raisin','Изюм',299,2.9,0.6,78.9,'fruit',{u:30,q:'30 г',step:10}),

    /* ── ОРЕХИ / СЕМЕНА ── */
    F('walnut','Грецкий орех',654,15.0,64.0,14.0,'fat',{u:20,q:'20 г',step:5,max:60}),
    F('almond','Миндаль',579,21.0,50.0,22.0,'fat',{u:20,q:'20 г',step:5,max:60}),
    F('peanut','Арахис',567,26.0,49.0,16.0,'fat',{u:20,q:'20 г',step:5,max:60}),
    F('cashew','Кешью',553,18.0,44.0,30.0,'fat',{u:20,q:'20 г',step:5,max:60}),
    F('pumpkin_seed','Семена тыквы',559,30.0,49.0,11.0,'fat',{u:20,q:'20 г',step:5,max:60}),
    F('flax','Лён (семена)',534,18.0,42.0,29.0,'fat',{u:15,q:'1 ст.л.',step:5,max:50}),
    F('sesame','Кунжут',573,17.0,50.0,23.0,'fat',{u:10,q:'10 г',step:5}),
    F('tahini','Кунжутная паста',595,17.0,54.0,21.0,'fat',{u:15,q:'15 г',step:5}),
    F('peanut_butter','Арахисовая паста',588,25.0,50.0,20.0,'fat',{u:20,q:'20 г',step:5}),

    /* ── СЛАДОСТИ / НАПИТКИ ── */
    F('honey','Мёд',328,0.8,0,80.3,'sweet',{u:20,q:'1 ч.л.',step:5,max:60}),
    F('sugar','Сахар',399,0,0,100,'sweet',{u:10,q:'1 ч.л.',step:5,max:60}),
    F('chocolate_milk','Шоколад молочный',550,6.0,35.0,52.0,'sweet',{u:25,q:'долька',step:5,max:100}),
    F('chocolate_dark','Шоколад тёмный',546,7.0,31.0,46.0,'sweet',{u:20,q:'20 г',step:5,max:100}),
    F('cookie','Печенье',435,6.5,15.0,70.0,'sweet',{u:15,q:'1 шт',step:1,max:10}),
    F('chips','Чипсы',536,6.0,33.0,53.0,'sweet',{u:50,q:'пачка 50 г',step:10,max:150}),
    F('candy','Конфета',976,0,100,0,'sweet',{u:10,q:'1 шт',step:1,max:10}),
    F('ice_cream','Мороженое',207,3.5,11.0,24.0,'sweet',{u:100,q:'100 г',step:25,max:250}),
    F('cola','Кола',42,0,0,10.6,'drink',{u:330,q:'банка 330 мл',step:100}),
    F('juice_apple','Сок яблочный',46,0.3,0.1,11.3,'drink',{u:250,q:'250 мл',step:50}),
    F('juice_orange','Сок апельсиновый',45,0.7,0.2,10.4,'drink',{u:250,q:'250 мл',step:50}),
    F('water','Вода',0,0,0,0,'drink',{u:250,q:'250 мл'}),
    F('latte','Латте',60,3.0,3.0,5.0,'drink',{u:250,q:'250 мл',step:50}),
    F('cocoa','Какао',60,1.5,1.5,9.0,'drink',{u:250,q:'250 мл',step:50}),
    F('protein_shake','Протеин сывороточный',370,78.0,5.0,8.0,'drink',{u:30,q:'30 г (1 скоуп)'}),
    F('isolate','Изолят протеина',370,85.0,2.0,3.0,'drink',{u:30,q:'30 г (1 скоуп)'}),
    F('creatine','Креатин моногидрат',0,0,0,0,'drink',{u:5,q:'5 г',step:5,max:20}),
    F('bc_aa','BCAA',400,80.0,1.0,3.0,'drink',{u:10,q:'10 г',step:5}),
    F('beer','Пиво',43,0.5,0,3.6,'drink',{u:500,q:'бутылка',step:100}),
    F('vodka','Водка',0,0,0,0,'drink',{u:50,q:'50 мл',step:10,max:200}),

    /* ── БЛЮДА / ГОТОВОЕ ── */
    F('borsch','Борщ',66,3.0,2.5,7.0,'dish',{u:300,q:'300 мл'}),
    F('chicken_soup','Куриный суп',60,4.0,2.0,5.0,'dish',{u:300,q:'300 мл'}),
    F('buckwheat_porridge','Гречневая каша',110,4.2,1.4,19.0,'dish',{u:200,q:'200 г'}),
    F('oat_porridge','Овсяная каша на воде',90,3.2,1.5,14.0,'dish',{u:250,q:'250 г'}),
    F('syrniki','Сырники',220,15.0,12.0,15.0,'dish',{u:100,q:'100 г'}),
    F('zapekanka','Творожная запеканка',165,11.0,7.0,14.0,'dish',{u:150,q:'150 г'}),
    F('pancake','Блин',190,5.0,7.0,28.0,'dish',{u:60,q:'1 блин',step:1,max:8}),
    F('pelmeni','Пельмени',240,11.0,9.0,27.0,'dish',{u:250,q:'250 г'}),
    F('vareniki','Вареники',200,8.0,6.0,28.0,'dish'),
    F('plov','Плов',180,7.0,7.0,20.0,'dish',{u:300,q:'300 г'}),
    F('pasta_tomato','Паста с томатами',130,5.5,2.5,21.0,'dish',{u:300,q:'300 г'}),
    F('pasta_chicken','Паста с курицей',175,10.0,5.0,21.0,'dish',{u:300,q:'300 г'}),
    F('fried_chicken','Курица жареная',260,24.0,16.0,3.0,'dish'),
    F('burger','Гамбургер',250,12.0,12.0,23.0,'dish',{u:200,q:'1 шт',step:1,max:5}),
    F('shawarma','Шаурма',255,13.0,13.0,22.0,'dish',{u:300,q:'300 г'}),
    F('pizza_margherita','Пицца «Маргарита»',250,11.0,10.0,30.0,'dish',{u:200,q:'2 куска',step:25,max:400}),
    F('lasagna','Лазанья',180,10.0,8.0,16.0,'dish'),
    F('salad_greek','Греческий салат',105,3.0,8.0,4.0,'dish',{u:200,q:'200 г'}),
    F('salad_olivier','Оливье',210,4.5,16.0,12.0,'dish',{u:200,q:'200 г'}),
    F('green_soup','Щи',35,1.5,1.5,4.0,'dish',{u:300,q:'300 мл'}),
    F('mushroom_soup','Грибной суп',45,2.5,1.8,4.8,'dish',{u:300,q:'300 мл'}),
    F('curry','Карри с курицей',145,9.0,7.0,12.0,'dish',{u:300,q:'300 г'}),
    F('scrambled','Яичница (2 яйца)',163,13.0,12.0,1.0,'dish',{u:120,q:'2 яйца'}),
    F('omelet_sandwich','Омлет с сыром',195,15.0,13.0,4.0,'dish',{u:150,q:'150 г'}),
    F('protein_bar','Протеиновый батончик',350,30.0,10.0,30.0,'dish',{u:60,q:'1 батончик',step:1,max:5})
  ];

  /* ── ГОТОВЫЕ ШАБЛОНЫ ПРИЁМА ПИЩИ ── */
  const templates = [
    { id:'tpl_oats_p', name:'Овсянка с бананом', meal:'breakfast', items:[
      { food:'oats', g:60 }, { food:'milk_25', g:200 }, { food:'banana', g:100 }, { food:'honey', g:10 } ] },
    { id:'tpl_egg_p', name:'Яйца + хлеб', meal:'breakfast', items:[
      { food:'egg', g:100 }, { food:'bread_whole', g:60 }, { food:'cucumber', g:80 } ] },
    { id:'tpl_curd', name:'Творог с ягодами', meal:'breakfast', items:[
      { food:'cottage_5', g:200 }, { food:'blueberry', g:80 } ] },
    { id:'tpl_shirniki', name:'Сырники', meal:'breakfast', items:[
      { food:'syrniki', g:150 }, { food:'sour_cream', g:20 } ] },
    { id:'tpl_shake', name:'Протеиновый шейк', meal:'breakfast', items:[
      { food:'protein_shake', g:30 }, { food:'milk_25', g:300 }, { food:'banana', g:100 } ] },
    { id:'tpl_buck', name:'Гречка + курица', meal:'lunch', items:[
      { food:'buckwheat', g:200 }, { food:'chicken_breast', g:180 }, { food:'cucumber', g:100 }, { food:'olive_oil', g:10 } ] },
    { id:'tpl_pasta', name:'Паста с курицей', meal:'lunch', items:[
      { food:'pasta', g:100 }, { food:'chicken_breast', g:150 }, { food:'tomato', g:120 }, { food:'olive_oil', g:10 } ] },
    { id:'tpl_bowl', name:'Боул с лососем', meal:'lunch', items:[
      { food:'salmon', g:150 }, { food:'rice', g:180 }, { food:'broccoli', g:120 }, { food:'avocado', g:50 } ] },
    { id:'tpl_salad_ch', name:'Салат с курицей', meal:'lunch', items:[
      { food:'chicken_breast', g:160 }, { food:'lettuce', g:80 }, { food:'cucumber', g:100 },
      { food:'tomato', g:100 }, { food:'olive_oil', g:10 } ] },
    { id:'tpl_fish', name:'Рыба + овощи', meal:'lunch', items:[
      { food:'cod', g:220 }, { food:'potato', g:200 }, { food:'greens', g:15 }, { food:'olive_oil', g:10 } ] },
    { id:'tpl_soup', name:'Суп + хлеб', meal:'lunch', items:[
      { food:'chicken_soup', g:300 }, { food:'bread_rye', g:30 } ] },
    { id:'tpl_omelet', name:'Омлет с сыром', meal:'dinner', items:[
      { food:'omelet_sandwich', g:180 }, { food:'greens', g:10 } ] },
    { id:'tpl_turkey', name:'Индейка с овощами', meal:'dinner', items:[
      { food:'turkey', g:180 }, { food:'zucchini', g:200 }, { food:'potato', g:150 } ] },
    { id:'tpl_cottage', name:'Творог 0% + орехи', meal:'dinner', items:[
      { food:'cottage_0', g:200 }, { food:'walnut', g:20 }, { food:'apple', g:120 } ] },
    { id:'tpl_salad', name:'Лёгкий овощной салат', meal:'dinner', items:[
      { food:'cucumber', g:150 }, { food:'tomato', g:150 }, { food:'cabbage', g:100 }, { food:'olive_oil', g:5 } ] },
    { id:'tpl_greek', name:'Греческий салат', meal:'dinner', items:[
      { food:'salad_greek', g:250 }, { food:'bread_rye', g:30 } ] },
    { id:'tpl_nut', name:'Яблоко + орехи', meal:'snack', items:[
      { food:'apple', g:150 }, { food:'almond', g:20 } ] },
    { id:'tpl_curd_s', name:'Творог 0% (перекус)', meal:'snack', items:[
      { food:'cottage_0', g:150 } ] },
    { id:'tpl_shake_s', name:'Шейк на кефире', meal:'snack', items:[
      { food:'protein_shake', g:30 }, { food:'kefir', g:250 } ] },
    { id:'tpl_veg', name:'Овощи и хумус-лайт', meal:'snack', items:[
      { food:'cucumber', g:150 }, { food:'carrot', g:100 } ] },
    { id:'tpl_dark', name:'Тёмный шоколад', meal:'snack', items:[
      { food:'chocolate_dark', g:20 } ] }
  ];

  const byId = {};
  list.forEach(f => { byId[f.id] = f; });
  templates.forEach(t => {
    t.kcal = t.items.reduce((s,i) => s + (byId[i.food] ? byId[i.food].kcal * i.g / 100 : 0), 0);
  });

  const CATS = {
    meat:'🥩', fish:'🐟', dairy:'🥛', grain:'🌾', veg:'🥦', fruit:'🍎',
    fat:'🥜', sweet:'🍫', drink:'🥤', dish:'🍲'
  };
  const MEALS = [
    { id:'breakfast', name:'Завтрак', icon:'☀', xp:15 },
    { id:'lunch',     name:'Обед',    icon:'☁', xp:15 },
    { id:'dinner',    name:'Ужин',    icon:'☾', xp:15 },
    { id:'snack',     name:'Перекус', icon:'◆', xp:5  }
  ];

  return { list, byId, templates, CATS, MEALS };
})();
