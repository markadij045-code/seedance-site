(function(){
  // ⚙️ УПРАВЛЕНИЕ ЗАПУСКОМ: true = заглушка (оплаты НЕ проходят), false = рабочий режим
  var LAUNCH_MODE = true;
  var LAUNCH_MESSAGE = 'Запуск сайта совсем скоро! 🚀 Оплата откроется в ближайшие дни. А пока можешь потестить интерфейс — нажми кнопку и увидишь, как будет работать.';

  var MAINURL='https://www.seedgen.ru';
  var ogu=document.querySelector('meta[property="og:url"]');
  if(ogu)ogu.setAttribute('content',MAINURL+'/');
  var can=document.querySelector('link[rel="canonical"]');
  if(can)can.setAttribute('href',MAINURL+'/');

  var MAXURL='https://max.ru/u/f9LHodD0cOK8_N1RfXgxLPzGiumem7bZA3oTYU5i0BAV5PK6dj7huMZRGGQ';
  var path=location.pathname;
  var key='gen';
  if(path.indexOf('gen.html')!==-1)key='create';
  else if(path.indexOf('photo')!==-1)key='photo';
  else if(path.indexOf('cartoon')!==-1)key='cartoon';
  else if(path.indexOf('avatar')!==-1)key='avatar';
  else if(path.indexOf('motion')!==-1)key='motion';
  else if(path.indexOf('lipsync')!==-1)key='lipsync';
  else if(path==='/')key='home';
  var WS=document.body.hasAttribute('data-ws');

  var PAYRE=/Оплатить|Создать видео|Сгенерировать|Оживить картинку|Запустить генерацию/;

  document.addEventListener('click', function(e){
    var b=e.target&&e.target.closest?e.target.closest('button'):null;
    if(!b)return;
    var t=b.textContent||'';
    if(!PAYRE.test(t))return;
    var ca=document.getElementById('contentAgree');
    if(ca&&!ca.checked){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert('Подтверди правила контента: поставь галочку в оранжевом блоке над кнопкой оплаты.');
    }
  }, true);

  if(LAUNCH_MODE){
    document.addEventListener('click', function(e){
      var b=e.target&&e.target.closest?e.target.closest('button'):null;
      if(!b)return;
      var t=b.textContent||'';
      if(PAYRE.test(t)){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        alert(LAUNCH_MESSAGE);
      }
    }, true);
  }

  var PHOTONOTE='📸 <b>Про фото и видео:</b> загружай только свои материалы или с согласия владельца. Нейросеть проверяет контент по правилам безопасности и может отклонить его (знаменитости, чужие фото, насилие, 18+). Тогда заказ не выполняется, а деньги автоматически возвращаются на карту в течение 1–3 дней.';

  var DATA={
    create:{t:'Создать видео',s:['Опиши видео словами. Кнопка «✨ Улучшить описание» превратит твой черновик в кинематографичный промпт.','Выбери формат кадра и длительность (от 5 до 30 сек).','Хочешь — прикрепи изображение: питомец, персонаж, иллюстрация. Реальные лица людей нейросеть в этой услуге отсеивает по правилам безопасности.','Отметь галочки согласия и нажми кнопку оплаты внизу.','Оплати — ⚡ Seedance 2.5 создаст ролик за 1–5 минут.']},
    home:{t:'Главная страница',s:['Нажми «Поехали?» — откроется витрина всех услуг.','Выбери карточку услуги — попадёшь на её страницу.','Дальше подсказки будут на самой странице услуги.']},
    photo:{t:'Оживи картинку',s:['Услуга объединена с «Создать видео»: загрузи изображение и опиши сцену.']},
    cartoon:{t:'Мультфильм из фото',s:['Загрузи фото с человеком (своё или с его согласия).','Опиши сюжет мультфильма.','Выбери формат и длительность.','Оплати, затем нажми «Сделать арт», потом «Оживить арт в видео». Оба шага включены в цену.']},
    avatar:{t:'Говорящий аватар',s:['Выбери ведущего — пресет-иллюстрацию (Алина, Макс, Ева или кот Барсик) — или загрузи своё фото, лицо крупно.','Выбери озвучку: своё аудио (MP3/WAV, до 30 сек). Озвучка текстом с выбором голоса откроется после запуска.','Выбери формат видео: 9:16, 16:9 или 1:1.','Оплати — Kling Avatar оживит лицо за 1–5 минут: длина видео равна длине озвучки.']},
    motion:{t:'Моушен контроль',s:['Загрузи фото персонажа (своё или с согласия).','Загрузи видео с движением (MP4, до 20 МБ, до 30 сек).','Выбери длительность.','Оплати — персонаж повторит движения через 1–5 минут.']},
    lipsync:{t:'Липсинк (дубляж)',s:['Загрузи видео с человеком (своё или с согласия).','Загрузи свою озвучку (MP3/WAV, до 5 МБ).','Выбери длительность.','Оплати — губы синхронизируются с твоим голосом за 1–5 минут.']}
  };
  var FAQ=[
    ['Как оплатить?','Карта, Мир, СБП, SberPay, ЮMoney. Без подписки — одна оплата за один заказ.'],
    ['Когда придёт видео?','Через 1–5 минут после оплаты видео появится в правой панели. Скачивай кнопкой «Скачать видео» — выкладывай куда хочешь.'],
    ['Сколько хранится видео?','7 дней на сервере. Скачай его сразу — потом оно удалится без возможности восстановления.'],
    ['А если видео не пришло из-за сбоя?','Напиши в MAX (ссылка внизу страницы): проверим чек и запустим генерацию заново или вернём деньги по оферте.'],
    ['А если нейросеть отклонила контент?','Деньги вернутся автоматически на ту же карту в течение 1–3 рабочих дней. Подробности — в оферте, раздел «Политика контента и возврата».'],
    ['Можно фото с людьми?','Да, в услугах «Мультфильм», «Аватар», «Моушен» и «Липсинк» — только своё фото или с согласия человека. В «Создать видео» нейросеть сама отсеивает реальные лица по правилам безопасности.'],
    ['Кто такие ведущие-пресеты?','Алина, Макс, Ева и кот Барсик — иллюстрации-заглушки, чтобы попробовать аватар без своего фото. Их можно использовать свободно. После запуска добавим ИИ-ведущих и озвучку текстом.'],
    ['А если нужно видео длиннее 30 секунд?','После запуска озвучку длиннее 30 секунд будем собирать из фрагментов в один ролик — как в больших аватар-студиях. Цена — за минуту готового видео.'],
    ['Зачем регистрация?','По желанию: аккаунт хранит твоих ведущих аватара и историю заказов на всех устройствах. Оплатить и получить видео можно и без неё.']
  ];

  var fl=document.createElement('link');
  fl.rel='stylesheet';
  fl.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap';
  document.head.appendChild(fl);

  var fi=document.createElement('link');
  fi.rel='icon';
  fi.type='image/svg+xml';
  fi.href='/favicon.svg';
  document.head.appendChild(fi);

  var st=document.createElement('style');
  st.textContent=''
  +'body{font-family:\'Inter\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif}'
  +'h1,h2,h3,h4,.logo{font-family:\'Space Grotesk\',\'Inter\',sans-serif}'
  +'body{background-image:radial-gradient(900px 500px at 85% -100px,rgba(163,230,53,.06),transparent 60%),radial-gradient(700px 500px at -100px 40%,rgba(59,130,246,.05),transparent 60%);background-attachment:fixed}'
  +'audio{color-scheme:dark}'
  +'.bar #launchBadge,.bar #hwInline,.bar-in>#launchBadge,.bar-in>#hwInline{display:none!important}'
  +'.warn{background:rgba(163,230,53,.06)!important;border-color:rgba(163,230,53,.25)!important;color:#c9cfba!important}'
  +'button,.mode,.tool,.pill,.new-card,.drop{transition:all .2s ease}'
  +'.links a:hover,.menu a:hover{color:#e5e7eb!important}'
  +'::selection{background:#A3E635;color:#000}'
  +'#trustBlock{margin:14px 0 0;padding:12px 14px;border:1px solid rgba(163,230,53,.2);background:rgba(163,230,53,.05);border-radius:12px;color:#9ca3af;font-size:.85rem;line-height:1.6;text-align:left}'
  +'#trustBlock a{color:#A3E635;text-decoration:none}'
  +'.hwNote{margin:10px 0 0;color:#c9cfba;font-size:.85rem;line-height:1.5}'
  +'.hwDl{display:inline-block;margin-top:12px;padding:10px 20px;background:#A3E635;color:#000;border-radius:999px;font-weight:700;text-decoration:none;font-size:.9rem}'
  +'#hwFloat{position:fixed;right:18px;bottom:86px;z-index:400;width:56px;height:56px;border-radius:50%;background:#A3E635;color:#0a0c08;font-size:1.6rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(163,230,53,.4)}'
  +'#hwModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:401;align-items:center;justify-content:center;padding:20px}'
  +'#hwModal.open{display:flex}'
  +'#hwBox{background:#101308;border:1px solid rgba(163,230,53,.4);border-radius:20px;padding:28px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;position:relative}'
  +'#hwBox h3{color:#A3E635;margin-bottom:14px;font-size:1.3rem}'
  +'#hwBox .hwPhoto{margin:0 0 14px;padding:12px 14px;background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.3);border-radius:12px;color:#e5e7eb;font-size:.88rem;line-height:1.6}'
  +'#hwBox .hwPhoto b{color:#ffb066}'
  +'#hwBox ol{margin:0 0 16px 20px;color:#e5e7eb;line-height:1.7}'
  +'#hwBox h4{color:#fff;margin:14px 0 8px}'
  +'#hwBox .faq{color:#9ca3af;font-size:.9rem;line-height:1.6;margin-bottom:10px}'
  +'#hwBox .faq b{color:#d1d5db}'
  +'#hwClose{position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(255,255,255,.5);font-size:1.4rem;cursor:pointer}'
  +'#hwBox a{color:#A3E635}'
  +'#hwInline{display:block;width:100%;margin-top:10px;padding:10px;border-radius:999px;border:1px solid rgba(163,230,53,.4);background:rgba(163,230,53,.08);color:#A3E635;font-size:.9rem;cursor:pointer}'
  +'.launchBadge{margin:10px 0 0;padding:10px 14px;background:rgba(255,140,0,.12);border:1px solid rgba(255,140,0,.4);border-radius:12px;color:#ffb066;font-size:.9rem;text-align:center;line-height:1.5}'
  +'.menu a.hwActive{color:#fff!important;font-weight:600;position:relative}'
  +'.menu a.hwActive::after{content:"";position:absolute;left:50%;transform:translateX(-50%);bottom:-7px;width:5px;height:5px;border-radius:50%;background:#A3E635}'
  +'.links a.hwActive{color:#fff!important}'
  +'.sidebar a.hwActive{color:#A3E635!important}';
  document.head.appendChild(st);

  function closeWelcomeGlobal(){
    var m=document.getElementById('welcomeModal');
    if(m)m.classList.remove('open');
    try{localStorage.setItem('seedgen_welcomed','1');}catch(e){}
  }

  var wb=document.querySelector('.welcome-box');
  if(wb&&!wb.getAttribute('data-new')){
    wb.setAttribute('data-new','1');
    wb.innerHTML='<button class="welcome-close" id="hwWelClose">✕</button>'
      +'<h2>🎬 Мурзик уже танцует</h2>'
      +'<p>SeedGen снимает видео по твоим словам: коты, мемы, мультфильмы, говорящие аватары. Выбери услугу — и поехали.</p>'
      +'<div class="gift">🔥 Хиты: «Моушен» и «Липсинк» — персонаж повторяет твой танец и говорит твоим голосом</div>'
      +'<button id="hwWelGo">Поехали?</button>';
    wb.querySelector('#hwWelClose').onclick=closeWelcomeGlobal;
    wb.querySelector('#hwWelGo').onclick=closeWelcomeGlobal;
  }

  function fixFooter(){
    var ft=document.querySelector('footer');
    if(!ft)return;
    ft.innerHTML=ft.innerHTML.replace('Малкова Ольга Аркадьевна','Малкова О. А.');
    if(ft.innerHTML.indexOf('Написать в MAX')===-1){
      ft.innerHTML+='<br><a href="'+MAXURL+'" target="_blank" rel="noopener">💬 Написать в MAX — поддержка</a>';
    }
    if(ft.innerHTML.indexOf('www.seedgen.ru')===-1){
      ft.innerHTML+='<br>Сайт: <a href="'+MAINURL+'/">www.seedgen.ru</a>';
    }
  }
  fixFooter();

  var ORDER=[['/gen.html','Создать видео'],['/cartoon.html','Мультфильм'],['/avatar.html','Аватар'],['/motion.html','Моушен'],['/lipsync.html','Липсинк'],['/help.html','Помощь'],['/pro-studio.html','PRO-студия']];

  function ensureOrder(container,withPro){
    if(!container)return;
    for(var o=0;o<ORDER.length;o++){
      var h=ORDER[o][0],t=ORDER[o][1];
      if(h==='/pro-studio.html'&&!withPro)continue;
      var el=container.querySelector('a[href="'+h+'"]');
      if(!el){
        el=document.createElement('a');
        el.href=h;el.textContent=t;
        if(h==='/pro-studio.html')el.style.color='#6b7a58';
      }
      container.appendChild(el);
    }
  }

  function ensureAccBtn(){
    var host=document.querySelector('.nav-in')||document.querySelector('.bar-in');
    if(!host||document.getElementById('hwAcc'))return;
    var t='';
    try{t=localStorage.getItem('seedgen_token')||'';}catch(e){}
    var a=document.createElement('a');
    a.id='hwAcc';
    a.href='/account.html';
    a.textContent=t?'👤 Кабинет':'👤 Войти';
    a.style.cssText='padding:9px 14px;border:1px solid rgba(255,255,255,.16);border-radius:10px;color:#e5e7eb;text-decoration:none;font-size:.88rem;white-space:nowrap';
    host.appendChild(a);
  }

  function fixMenu(){
    var as=document.querySelectorAll('.links a, .sidebar a, .menu a');
    for(var i=0;i<as.length;i++){
      var a=as[i];
      var href=a.getAttribute('href')||'';
      var txt=(a.textContent||'').trim();
      if(href==='/'&&txt.indexOf('Генерация')!==-1){
        a.textContent=a.textContent.replace('Генерация','Главная');
      }
      if(href==='/photo.html'){
        a.parentNode.removeChild(a);
      }
    }
    ensureOrder(document.querySelector('.links'),false);
    ensureOrder(document.querySelector('.menu'),true);
    var sb=document.querySelector('.sidebar');
    if(sb){
      if(!sb.querySelector('a[href="/gen.html"]')){
        var nb=document.createElement('a');
        nb.href='/gen.html';nb.textContent='📝 Создать видео';
        var sc=sb.querySelector('.sidebar-close');
        if(sc&&sc.nextSibling){sb.insertBefore(nb,sc.nextSibling);}else{sb.appendChild(nb);}
      }
      if(!sb.querySelector('a[href="/pro-studio.html"]')){
        var pb=document.createElement('a');
        pb.href='/pro-studio.html';pb.textContent='🎛 PRO-студия';
        sb.appendChild(pb);
      }
      var sas=sb.querySelectorAll('a');
      for(var w=0;w<sas.length;w++){
        if((sas[w].getAttribute('href')||'')===path){sas[w].classList.add('hwActive');}
      }
    }
    var hl=document.querySelectorAll('.links a, .menu a');
    for(var e2=0;e2<hl.length;e2++){
      if((hl[e2].getAttribute('href')||'')===path){hl[e2].classList.add('hwActive');}
    }
    ensureAccBtn();
  }
  fixMenu();

  var payBtn=null;
  var btns=document.querySelectorAll('button');
  for(var i=0;i<btns.length;i++){
    var t=btns[i].textContent||'';
    if(/Оплатить|Создать видео|Сгенерировать|Оживить картинку/.test(t)){payBtn=btns[i];break;}
  }
  if(!WS&&payBtn&&!document.getElementById('trustBlock')&&!document.querySelector('.trust')){
    var trust=document.createElement('div');
    trust.id='trustBlock';
    trust.innerHTML='🔒 Официально: самозанятая Малкова О. А., ИНН 420900493994 · <a href="/legal.html">оферта и реквизиты</a>';
    payBtn.parentNode.insertBefore(trust,payBtn);
  }
  if(!WS&&payBtn&&!document.getElementById('contentConfirm')){
    var cc=document.createElement('div');
    cc.id='contentConfirm';
    cc.style.cssText='margin:14px 0 0;padding:14px 16px;background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.3);border-radius:12px;color:#e5e7eb;font-size:.88rem;line-height:1.6';
    cc.innerHTML='<b style="color:#ffb066">⚠️ Перед оплатой</b><br>Нейросеть может отклонить контент по правилам безопасности (знаменитости, насилие, чужие фото). Тогда деньги автоматически вернутся на карту в течение 1–3 дней. Подробности — в <a href="/legal.html#content-policy" style="color:#A3E635">оферте</a>.<label style="display:flex;gap:10px;align-items:flex-start;margin-top:10px;cursor:pointer"><input type="checkbox" id="contentAgree" style="width:18px;height:18px;margin-top:2px;accent-color:#A3E635;flex:0 0 auto"><span>Я понимаю, что нейросеть может отклонить контент, и тогда деньги вернутся автоматически</span></label>';
    payBtn.parentNode.insertBefore(cc,payBtn);
  }

  if(LAUNCH_MODE){
    var badgeHTML='🚧 <b>Сайт готовится к запуску</b><br>Оплата откроется в ближайшие дни. Пока можешь потестить интерфейс — всё работает, кроме оплаты.';
    var host=document.getElementById('wsNotice');
    if(host){ host.innerHTML='<div id="launchBadge" class="launchBadge">'+badgeHTML+'</div>'; }
    else if(!WS&&payBtn&&!document.getElementById('launchBadge')){
      var badge=document.createElement('div');
      badge.id='launchBadge';
      badge.className='launchBadge';
      badge.innerHTML=badgeHTML;
      payBtn.parentNode.insertBefore(badge, payBtn);
    }
  }

  if(key==='cartoon'||key==='avatar'||key==='motion'||key==='lipsync'){
    var drop=document.querySelector('.drop');
    if(drop&&!drop.parentNode.querySelector('.hwNote')){
      var cn=document.createElement('div');
      cn.className='hwNote';
      cn.textContent='🛡 Загружай только своё фото/видео или материал человека, который дал согласие на его использование.';
      drop.parentNode.insertBefore(cn,drop.nextSibling);
    }
  }

  var m=document.createElement('div');m.id='hwModal';
  var d=DATA[key]||DATA.create;
  var html='<button id="hwClose">✕</button><h3>❓ '+d.t+' — как это работает</h3>'
    +'<div class="hwPhoto">'+PHOTONOTE+'</div>'
    +'<ol>';
  for(var j=0;j<d.s.length;j++){html+='<li>'+d.s[j]+'</li>';}
  html+='</ol><h4>Частые вопросы</h4>';
  for(var k=0;k<FAQ.length;k++){html+='<div class="faq"><b>'+FAQ[k][0]+'</b><br>'+FAQ[k][1]+'</div>';}
  html+='<p class="faq"><a href="/help.html">Все вопросы и ответы →</a></p>';
  m.innerHTML='<div id="hwBox">'+html+'</div>';
  document.body.appendChild(m);

  function open(){m.classList.add('open');}
  function close(){m.classList.remove('open');}
  m.querySelector('#hwClose').onclick=close;
  m.onclick=function(e){if(e.target===m)close();};

  var fb=document.createElement('button');
  fb.id='hwFloat';fb.type='button';fb.textContent='?';fb.title='Помощь';
  fb.onclick=open;
  document.body.appendChild(fb);

  if(!WS&&payBtn){
    var ib=document.createElement('button');
    ib.id='hwInline';ib.type='button';
    ib.textContent='❓ Пошаговая инструкция — для новичков';
    ib.onclick=open;
    payBtn.parentNode.insertBefore(ib,payBtn);
  }

  setInterval(function(){
    var v=document.querySelector('#result video');
    if(v&&v.src&&!v.getAttribute('data-dl')){
      v.setAttribute('data-dl','1');
      var dl=document.createElement('a');
      dl.className='hwDl';
      dl.href=v.src;
      dl.target='_blank';
      dl.rel='noopener';
      dl.textContent='⬇ Скачать видео';
      v.parentNode.insertBefore(dl,v.nextSibling);
      var note=document.createElement('div');
      note.className='hwNote';
      note.textContent='💾 Скачай видео в течение 7 дней — потом оно удалится с сервера без возможности восстановления.';
      v.parentNode.insertBefore(note,dl.nextSibling);
    }
  },1000);

  window.addEventListener('load',function(){
    if(!WS&&payBtn&&!document.getElementById('agreeWrap')){
      var wrap=document.createElement('div');
      wrap.id='agreeWrap';
      wrap.style.cssText='margin:16px 0 0;color:#9ca3af;font-size:.9rem;line-height:1.5';
      wrap.innerHTML='<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="agree" style="width:18px;height:18px;margin-top:2px;accent-color:#A3E635;flex:0 0 auto"><span>Я принимаю условия <a href="/legal.html#offer">публичной оферты</a> и даю согласие на <a href="/legal.html#policy">обработку персональных данных</a></span></label>';
      payBtn.parentNode.insertBefore(wrap,payBtn);
    }
  });
})();
