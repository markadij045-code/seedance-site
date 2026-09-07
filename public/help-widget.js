(function(){
  var path=location.pathname;
  var key='gen';
  if(path.indexOf('photo')!==-1)key='photo';
  else if(path.indexOf('cartoon')!==-1)key='cartoon';
  else if(path.indexOf('avatar')!==-1)key='avatar';
  else if(path.indexOf('motion')!==-1)key='motion';
  else if(path.indexOf('lipsync')!==-1)key='lipsync';

  var DATA={
    gen:{t:'Видео из текста',s:['Опиши видео словами. Не знаешь что написать? Нажми «🎲 Придумай за меня».','Выбери формат кадра (📐) и длительность.','Хочешь — прикрепи картинку-пример (📎).','Отметь галочку согласия и нажми «Сгенерировать».','Оплати — видео появится на странице через 1–5 минут.']},
    photo:{t:'Оживи картинку',s:['Выбери картинку БЕЗ людей: питомцы, природа, игрушки, арт.','Хочешь — опиши, что должно происходить.','Отметь галочку и нажми «Оживить картинку».','Оплати — видео через 1–3 минуты.']},
    cartoon:{t:'Мультфильм из фото',s:['Загрузи фото с человеком.','Опиши сюжет мультфильма.','Выбери формат и длительность.','Оплати, затем нажми «Сделать арт», потом «Оживить арт в видео».']},
    avatar:{t:'Говорящий аватар',s:['Загрузи фото — лицо крупно.','Выбери озвучку: текст (напиши и выбери голос) или своё аудио.','Выбери ориентацию видео.','Оплати — видео через 1–5 минут.']},
    motion:{t:'Моушен контроль',s:['Загрузи фото персонажа.','Загрузи видео с движением (MP4, до 20 МБ, до 30 сек).','Выбери длительность.','Оплати — персонаж повторит движения через 1–5 минут.']},
    lipsync:{t:'Липсинк (дубляж)',s:['Загрузи видео с человеком (лицо крупно).','Загрузи свою озвучку (MP3/WAV, до 5 МБ).','Оплати — губы синхронизируются с твоим голосом за 1–5 минут.']}
  };
  var FAQ=[
    ['Как оплатить?','Карта, Мир, СБП, SberPay, ЮMoney. Без подписки — одна оплата за один заказ.'],
    ['Когда придёт видео?','Через 1–5 минут после оплаты, прямо на странице. Скачивать ничего не нужно.'],
    ['А если не получится?','Напиши нам — проверим чек и сделаем видео вручную или вернём деньги.'],
    ['Можно фото с людьми?','В «Оживи картинку» — нет (защита от дипфейков). Во всех остальных услугах — можно.']
  ];

  var st=document.createElement('style');
  st.textContent='#hwFloat{position:fixed;right:18px;bottom:18px;z-index:400;width:56px;height:56px;border-radius:50%;background:#A3E635;color:#0a0c08;font-size:1.6rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(163,230,53,.4)}#hwModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:401;align-items:center;justify-content:center;padding:20px}#hwModal.open{display:flex}#hwBox{background:#101308;border:1px solid rgba(163,230,53,.4);border-radius:20px;padding:28px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;position:relative}#hwBox h3{color:#A3E635;margin-bottom:14px;font-size:1.3rem}#hwBox ol{margin:0 0 16px 20px;color:#e5e7eb;line-height:1.7}#hwBox h4{color:#fff;margin:14px 0 8px}#hwBox .faq{color:#9ca3af;font-size:.9rem;line-height:1.6;margin-bottom:10px}#hwBox .faq b{color:#d1d5db}#hwClose{position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(255,255,255,.5);font-size:1.4rem;cursor:pointer}#hwBox a{color:#A3E635}#hwInline{display:block;width:100%;margin-top:10px;padding:10px;border-radius:999px;border:1px solid rgba(163,230,53,.4);background:rgba(163,230,53,.08);color:#A3E635;font-size:.9rem;cursor:pointer}';
  document.head.appendChild(st);

  var m=document.createElement('div');m.id='hwModal';
  var d=DATA[key];
  var html='<button id="hwClose">✕</button><h3>❓ '+d.t+' — как это работает</h3><ol>';
  for(var j=0;j<d.s.length;j++)html+='<li>'+d.s[j]+'</li>';
  html+='</ol><h4>Частые вопросы</h4>';
  for(var k=0;k<FAQ.length;k++)html+='<div class="faq"><b>'+FAQ[k][0]+'</b><br>'+FAQ[k][1]+'</div>';
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

  var btns=document.querySelectorAll('button');
  for(var i=0;i<btns.length;i++){
    var t=btns[i].textContent||'';
    if(/Оплатить|Сгенерировать|Оживить картинку/.test(t)){
      var ib=document.createElement('button');
      ib.id='hwInline';ib.type='button';
      ib.textContent='❓ Пошаговая инструкция — для новичков';
      ib.onclick=open;
      btns[i].parentNode.insertBefore(ib,btns[i]);
      break;
    }
  }

  var links=document.querySelector('.links');
  if(links){
    var a=document.createElement('a');
    a.href='/help.html';a.textContent='❓ Помощь';
    links.appendChild(a);
  }
})();
