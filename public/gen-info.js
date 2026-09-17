(function(){
  var ms=document.createElement('style');
  ms.textContent=''
  +'@media(max-width:900px){'
  +'.ws{grid-template-columns:1fr;gap:14px;padding:0 14px;margin-top:70px}'
  +'.ws>aside{order:-1}'
  +'.panel{padding:18px}'
  +'.sval{font-size:1.5rem}'
  +'.sprice{font-size:1.15rem}'
  +'.sc-cap{font-size:.75rem}'
  +'.sc-ctrl{margin:8px 10px 10px}'
  +'.sc-link{font-size:.72rem;padding:6px 10px}'
  +'.bar-in{flex-direction:column;align-items:stretch;gap:8px;padding:10px 14px}'
  +'.bar-price{order:1;font-size:1.25rem}'
  +'.bar .btn{order:2;width:100%;margin-left:0}'
  +'.agree{order:3;min-width:0;font-size:.72rem}'
  +'#status{order:4}'
  +'.psteps{margin-bottom:14px}'
  +'.lbl{margin:16px 0 8px}'
  +'}';
  document.head.appendChild(ms);

  var wrap=document.getElementById('scWrap');
  if(!wrap)return;
  var d1=document.createElement('div');
  d1.className='rolehint';
  d1.style.marginTop='12px';
  d1.innerHTML='📏 Нейросеть отклоняет реальные лица, знаменитостей и чужой контент: заказ не выполняется, деньги возвращаются автоматически. Подробности — в <a href="/legal.html#content-policy" style="color:var(--lime)">оферте</a>.';
  var d2=document.createElement('div');
  d2.className='rolehint';
  d2.style.marginTop='8px';
  d2.innerHTML='💡 Вставь @ в описание, чтобы сослаться на загруженный файл: @Image1 — главный герой, @Video1 — движение камеры, @Audio1 — ритм.';
  var d3=document.createElement('div');
  d3.className='rolehint';
  d3.style.marginTop='8px';
  d3.innerHTML='🎓 Делаете видео впервые? Прочитайте <a href="/guide.html" style="color:var(--lime)">инструкцию</a> перед стартом: от того, как вы напишете промпт, зависит качество видео.';
  wrap.insertAdjacentElement('afterend',d3);
  wrap.insertAdjacentElement('afterend',d2);
  wrap.insertAdjacentElement('afterend',d1);
})();
