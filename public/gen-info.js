(function(){
  var wrap = document.getElementById('scWrap');
  if(!wrap) return;
  var d1 = document.createElement('div');
  d1.className = 'rolehint';
  d1.style.marginTop = '12px';
  d1.innerHTML = '📏 Нейросеть отклоняет реальные лица, знаменитостей и чужой контент: заказ не выполняется, деньги возвращаются автоматически. Подробности — в <a href="/legal.html#content-policy" style="color:var(--lime)">оферте</a>.';
  var d2 = document.createElement('div');
  d2.className = 'rolehint';
  d2.style.marginTop = '8px';
  d2.innerHTML = '💡 Вставь @ в описание, чтобы сослаться на загруженный файл: @Image1 — главный герой, @Video1 — движение камеры, @Audio1 — ритм.';
  var d3 = document.createElement('div');
  d3.className = 'rolehint';
  d3.style.marginTop = '8px';
  d3.innerHTML = '🎓 Делаете видео впервые? Прочитайте <a href="/guide.html" style="color:var(--lime)">инструкцию</a> перед стартом: от того, как вы напишете промпт, зависит качество видео.';
  wrap.insertAdjacentElement('afterend', d3);
  wrap.insertAdjacentElement('afterend', d2);
  wrap.insertAdjacentElement('afterend', d1);
})();
