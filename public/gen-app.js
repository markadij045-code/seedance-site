function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarBackdrop').classList.toggle('open');
}

var MODELS={
 'wan-3.0':{name:'Wan 3.0',base:99,per:10,max:30,api:'wan-3.0'},
 'kling-standard':{name:'Kling',base:129,per:15,max:10,api:'kling-video'},
 'seedance-2.0':{name:'Seedance 2.0',base:129,per:15,max:15,api:'seedance-2-0'},
 'seedance-2.5':{name:'Seedance 2.5',base:199,per:30,max:30,api:'seedance-2-5'}
};
var SURCHARGE={'480p':0,'720p':200,'1080p':300};
var modelKey='seedance-2.5';
var enhance=true;
var orientation='16:9';
var quality='480p';
var seconds=5;
var refs=[];
var restoring=false, stage='setup', paidSeen=false, activePaymentId=null;
var sendBtn=document.getElementById('sendBtn'), statusEl=document.getElementById('status');
var promptBox=document.getElementById('promptBox'), pop=document.getElementById('popMenu'), studio=document.getElementById('stage');
var refPrev=document.getElementById('refPrev'), refRow=document.getElementById('refRow');
sendBtn.insertAdjacentHTML('beforeend','<span style="display:none">Оплатить</span>');
var token=''; try{ token=localStorage.getItem('seedgen_token')||localStorage.getItem('yk_token')||''; }catch(e){}
var popKind=null;
var savedRange=null;

function setStatus(t){ statusEl.textContent=t; }
function model(){ return MODELS[modelKey]||MODELS['seedance-2.5']; }
function price(){ return model().base + Math.max(0,(seconds-5))*model().per + (SURCHARGE[quality]||0); }

function saveCaret(){
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount) return;
  var r=sel.getRangeAt(0);
  if(promptBox.contains(r.commonAncestorContainer)){ savedRange=r.cloneRange(); }
}
document.addEventListener('selectionchange',saveCaret);
promptBox.addEventListener('keyup',saveCaret);
promptBox.addEventListener('mouseup',saveCaret);

function updatePlaceholder(){
  var hasText=(promptBox.textContent||'').trim().length>0;
  var hasMention=!!promptBox.querySelector('.mention');
  promptBox.classList.toggle('empty', !hasText && !hasMention);
}

function promptText(){
  var c=promptBox.cloneNode(true);
  c.querySelectorAll('.reftile,.addbadge,.tile-stack').forEach(function(e){ e.remove(); });
  c.querySelectorAll('.mention').forEach(function(m){
    var idx=m.dataset.ref;
    var txt=document.createTextNode('@Image'+idx+' ');
    m.replaceWith(txt);
  });
  return (c.textContent||'').replace(/\s+/g,' ').trim();
}

function updateChips(){
  document.getElementById('pcModel').textContent='⚙ '+model().name+' ⌄';
  document.getElementById('pcEnh').textContent=(enhance?'✨ Простой режим':'✨ Продвинутый')+' ⌄';
  document.getElementById('pcRef').textContent='🖼 Референсы ('+refs.length+') ⌄';
  document.getElementById('pcFQ').textContent='📱 '+orientation+' · '+quality+' ⌄';
  document.getElementById('pcDur').textContent='⏱ '+seconds+' сек ⌄';
  document.getElementById('priceVal').textContent=price();
}
function updateSend(){
  if(stage==='done'){ sendBtn.disabled=true; sendBtn.title='Готово'; }
  else{ sendBtn.disabled=false; sendBtn.title=paidSeen?'Запустить генерацию':'На оплату'; }
}
function updateSteps(){
  var ok=!!promptText();
  var s1=document.getElementById('st1'),s2=document.getElementById('st2'),s3=document.getElementById('st3');
  s1.className='pstep'+(ok?' done':' active');
  s2.className='pstep'+(paidSeen?' done':(ok?' active':''));
  s3.className='pstep'+(stage==='done'?' done':(paidSeen?' active':''));
  document.getElementById('resultSec').style.display=(paidSeen||stage!=='setup')?'block':'none';
}

function hideRefPrev(){ refPrev.classList.remove('open'); refPrev.innerHTML=''; }
function showRefPrev(i,el){
  hideRefPrev();
  refPrev.innerHTML='<img src="data:image/jpeg;base64,'+refs[i]+'">';
  refPrev.classList.add('open');
  var s=studio.getBoundingClientRect(), t=el.getBoundingClientRect();
  var left=t.left-s.left;
  if(left+240>s.width-8) left=Math.max(8,s.width-248);
  refPrev.style.left=left+'px';
  var top=t.top-s.top-refPrev.offsetHeight-10;
  if(top<-40) top=t.bottom-s.top+10;
  refPrev.style.top=top+'px';
}

function renderTiles(){
  hideRefPrev();
  refRow.innerHTML='';
  if(refs.length){
    var stack=document.createElement('span');
    stack.className='tile-stack';
    stack.setAttribute('contenteditable','false');
    stack.title='Референсы — '+refs.length+' шт. Наведи, чтобы раскрыть. Кликни для меню.';
    refs.forEach(function(r,i){
      var t=document.createElement('span');
      t.className='reftile';
      t.title='Референс @Image'+(i+1);
      t.innerHTML='<img src="data:image/jpeg;base64,'+r+'">';
      var x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='✕';
      x.onclick=function(ev){ ev.stopPropagation(); refs.splice(i,1); renderTiles(); saveDraft(); };
      t.appendChild(x);
      t.addEventListener('mouseenter',function(){ showRefPrev(i,t); });
      t.addEventListener('mouseleave',hideRefPrev);
      stack.appendChild(t);
    });
    stack.addEventListener('click',function(ev){
      if(ev.target.classList.contains('x'))return;
      openPopEl(stack,refPopHTML(),'ref',mountRefPop);
    });
    refRow.appendChild(stack);
  }
  var add=document.createElement('span');
  add.className='addbadge'; add.setAttribute('contenteditable','false');
  add.title='Добавить референс'; add.textContent='+';
  add.onclick=function(){ openPopEl(add,refPopHTML(),'ref',mountRefPop); };
  refRow.appendChild(add);
  updateChips(); updateSteps(); updateSend(); updatePlaceholder();
}

function closePop(){ pop.classList.remove('open'); popKind=null; }
function openPop(rect,html,kind,mount){
  popKind=kind; pop.innerHTML=html; pop.classList.add('open');
  var s=studio.getBoundingClientRect();
  var top=rect.bottom-s.top+6, left=rect.left-s.left;
  pop.style.top=top+'px'; pop.style.left='0px';
  var w=pop.offsetWidth, sw=s.width;
  if(left+w>sw-8) left=Math.max(8,sw-w-8);
  pop.style.left=left+'px';
  if(mount)mount();
}
function openPopEl(el,html,kind,mount){ openPop(el.getBoundingClientRect(),html,kind,mount); }
document.addEventListener('mousedown',function(e){
  if(!pop.contains(e.target)) closePop();
  var rm=document.getElementById('rmenu');
  if(rm.classList.contains('open')&&!rm.contains(e.target)&&!e.target.closest('#rbUser')) rm.classList.remove('open');
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closePop(); hideRefPrev(); document.getElementById('shopMask').classList.remove('open'); document.getElementById('rmenu').classList.remove('open'); } });

function modelPopHTML(){
  var h='<div class="pu-head">Модель генерации</div>';
  Object.keys(MODELS).forEach(function(k){
    var m=MODELS[k];
    h+='<div class="pu-item" data-model="'+k+'"><span class="nc"><span class="nm">'+m.name+'</span><span class="pu-desc">от '+m.base+' 🐭 · до '+m.max+' сек за дубль</span></span>'+(modelKey===k?'<span class="chk">✓</span>':'')+'</div>';
  });
  return h;
}
function mountModelPop(){
  pop.querySelectorAll('[data-model]').forEach(function(el){
    el.addEventListener('click',function(){
      modelKey=el.getAttribute('data-model');
      if(seconds>model().max) seconds=model().max;
      closePop(); updateChips(); saveDraft();
    });
  });
}

function enhPopHTML(){
  return '<div class="pu-head">Режим промпта — как кот читает твой текст</div>'
    +'<div class="pu-item" data-enh="1"><span class="mi">✨</span><span class="nc"><span class="nm">Простой режим</span><span class="pu-desc">Пиши своими словами, как говоришь другу. Кот сам переведёт на киноязык: добавит камеру, свет, движение и детали. Выбери, если пробуешь впервые.</span></span>'+(enhance?'<span class="chk">✓</span>':'')+'</div>'
    +'<div class="pu-item" data-enh="0"><span class="mi">🎛</span><span class="nc"><span class="nm">Продвинутый режим</span><span class="pu-desc">Твой текст уходит в нейросеть дословно, без правок и улучшений. Выбери, если уже умеешь писать промпты сам и хочешь полный контроль.</span></span>'+(!enhance?'<span class="chk">✓</span>':'')+'</div>';
}
function mountEnhPop(){
  pop.querySelectorAll('[data-enh]').forEach(function(el){
    el.addEventListener('click',function(){ enhance=el.getAttribute('data-enh')==='1'; closePop(); updateChips(); saveDraft(); });
  });
}

function refPopHTML(){
  var h='<div class="pu-head">Референсы</div>';
  h+='<div class="pu-item" data-act="upload"><span class="mi">＋</span><span class="nm">Загрузить фото (своё или с согласия)</span></div>';
  if(refs.length){
    h+='<div class="pu-head">Добавленные</div>';
    refs.forEach(function(r,i){
      h+='<div class="pu-item" data-del="'+i+'"><img src="data:image/jpeg;base64,'+r+'"><span class="nm">@Image'+(i+1)+'</span><span class="chk" style="color:#fca5a5">✕</span></div>';
    });
  }
  return h;
}
function mountRefPop(){
  pop.querySelectorAll('[data-act="upload"]').forEach(function(el){ el.addEventListener('click',function(){ closePop(); document.getElementById('photoInput').click(); }); });
  pop.querySelectorAll('[data-del]').forEach(function(el){
    el.addEventListener('click',function(){ refs.splice(parseInt(el.getAttribute('data-del'),10),1); closePop(); renderTiles(); saveDraft(); });
  });
}

function fqPopHTML(){
  return '<div class="pu-lbl">Формат кадра</div><div class="pu-row" id="puAsp">'+['16:9','9:16','1:1','4:3','3:4','21:9'].map(function(a){ return '<button type="button" data-asp="'+a+'" class="'+(a===orientation?'on':'')+'">'+a+'</button>'; }).join('')+'</div>'
    +'<div class="pu-lbl">Качество</div><div class="pu-row" id="puQ">'+['480p','720p','1080p'].map(function(q){ return '<button type="button" data-q="'+q+'" class="'+(q===quality?'on':'')+'">'+q+(SURCHARGE[q]?' +'+SURCHARGE[q]:'')+'</button>'; }).join('')+'</div>';
}
function mountFqPop(){
  pop.querySelectorAll('[data-asp]').forEach(function(b){ b.addEventListener('click',function(){ orientation=b.getAttribute('data-asp'); closePop(); updateChips(); saveDraft(); }); });
  pop.querySelectorAll('[data-q]').forEach(function(b){ b.addEventListener('click',function(){ quality=b.getAttribute('data-q'); closePop(); updateChips(); saveDraft(); }); });
}

function durPopHTML(){
  var opts=[]; for(var s=5;s<=model().max;s+=5) opts.push(s);
  return '<div class="pu-lbl">Длительность (лимит модели '+model().max+' сек)</div><div class="pu-row" id="puDur">'+opts.map(function(s){ return '<button type="button" data-sec="'+s+'" class="'+(s===seconds?'on':'')+'">'+s+' сек</button>'; }).join('')+'</div>';
}
function mountDurPop(){
  pop.querySelectorAll('[data-sec]').forEach(function(b){ b.addEventListener('click',function(){ seconds=parseInt(b.getAttribute('data-sec'),10); closePop(); updateChips(); saveDraft(); }); });
}

function atPopHTML(){
  if(!refs.length) return '<div class="pu-head">Упоминания</div><div class="pu-item dis"><span class="nm">Сначала добавь референсы кружком +</span></div>';
  var h='<div class="pu-head">Вставить в текст, где стоит курсор</div>';
  refs.forEach(function(r,i){
    h+='<div class="pu-item" data-at="'+(i+1)+'"><img src="data:image/jpeg;base64,'+r+'"><span class="nm">@Image'+(i+1)+'</span></div>';
  });
  return h;
}
function mountAtPop(){
  pop.querySelectorAll('[data-at]').forEach(function(el){
    el.addEventListener('click',function(){ insertMention(parseInt(el.getAttribute('data-at'),10)); closePop(); });
  });
}

function insertMention(idx){
  promptBox.focus();
  var sel=window.getSelection();
  var range=null;
  if(savedRange&&promptBox.contains(savedRange.commonAncestorContainer)){
    range=savedRange;
  }else if(sel&&sel.rangeCount&&promptBox.contains(sel.getRangeAt(0).commonAncestorContainer)){
    range=sel.getRangeAt(0);
  }

  var chip=document.createElement('span');
  chip.className='mention';
  chip.setAttribute('contenteditable','false');
  chip.dataset.ref=idx;
  chip.innerHTML='<img src="data:image/jpeg;base64,'+refs[idx-1]+'"><span class="tok">@Image'+idx+'</span><button type="button" class="x" title="Убрать">✕</button>';
  chip.querySelector('.x').onclick=function(ev){ ev.stopPropagation(); chip.remove(); updateSteps(); updateSend(); updatePlaceholder(); saveDraft(); };

  if(range){
    sel.removeAllRanges(); sel.addRange(range);
    var container=range.startContainer;
    var offset=range.startOffset;
    var prevChar='';
    if(container.nodeType===3 && offset>0){ prevChar=container.textContent[offset-1]||''; }
    if(prevChar && prevChar!==' ' && prevChar!=='\n' && prevChar!=='\t'){
      var sp=document.createTextNode(' ');
      range.insertNode(sp);
      range.setStartAfter(sp); range.collapse(true);
    }
    range.deleteContents();
    range.insertNode(chip);
    range.setStartAfter(chip); range.collapse(true);
    var trail=document.createTextNode(' ');
    range.insertNode(trail);
    range.setStartAfter(trail); range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
    savedRange=range.cloneRange();
  }else{
    var tail=promptBox.textContent||'';
    if(tail && !/\s$/.test(tail)) promptBox.appendChild(document.createTextNode(' '));
    promptBox.appendChild(chip);
    promptBox.appendChild(document.createTextNode(' '));
    var r2=document.createRange(); r2.selectNodeContents(promptBox); r2.collapse(false);
    sel.removeAllRanges(); sel.addRange(r2);
    savedRange=r2.cloneRange();
  }
  updateSteps(); updateSend(); updatePlaceholder(); saveDraft();
}

document.getElementById('pcModel').addEventListener('click',function(){ openPopEl(this,modelPopHTML(),'model',mountModelPop); });
document.getElementById('pcEnh').addEventListener('click',function(){ openPopEl(this,enhPopHTML(),'enh',mountEnhPop); });
document.getElementById('pcRef').addEventListener('click',function(){ openPopEl(this,refPopHTML(),'ref',mountRefPop); });
document.getElementById('pcFQ').addEventListener('click',function(){ openPopEl(this,fqPopHTML(),'fq',mountFqPop); });
document.getElementById('pcDur').addEventListener('click',function(){ openPopEl(this,durPopHTML(),'dur',mountDurPop); });
document.getElementById('pcAt').addEventListener('click',function(){ openPopEl(this,atPopHTML(),'at',mountAtPop); });

function shrink(dataUrl,cb){
  var img=new Image();
  img.onload=function(){
    var max=1024,w=img.width,h=img.height;
    if(w>max||h>max){ var k=Math.min(max/w,max/h); w=Math.round(w*k); h=Math.round(h*k); }
    var c=document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    cb(c.toDataURL('image/jpeg',0.85));
  };
  img.src=dataUrl;
}
document.getElementById('photoInput').addEventListener('change',function(e){
  var files=Array.prototype.slice.call(e.target.files);
  if(!files.length) return;
  setStatus('Обрабатываем референсы...');
  var done=0;
  files.forEach(function(f){
    if(f.type.indexOf('image/')!==0||f.size>10*1024*1024){ done++; if(done>=files.length){renderTiles();setStatus('');} return; }
    var reader=new FileReader();
    reader.onload=function(){
      shrink(reader.result,function(d){
        refs.push(d.split(',')[1]);
        done++;
        if(done>=files.length){ renderTiles(); setStatus(''); saveDraft(); }
      });
    };
    reader.readAsDataURL(f);
  });
  e.target.value='';
});

function histLoad(){ try{ return JSON.parse(localStorage.getItem('seedgen_gen_history')||'[]'); }catch(e){ return []; } }
function histSave(l){ try{ localStorage.setItem('seedgen_gen_history',JSON.stringify(l.slice(0,10))); }catch(e){} }
function histRender(){
  var l=histLoad();
  var sec=document.getElementById('recentSec');
  var box=document.getElementById('histList');
  if(!l.length){ sec.style.display='none'; box.innerHTML=''; document.getElementById('histCount').textContent=''; return; }
  sec.style.display='';
  document.getElementById('histCount').textContent='всего '+l.length;
  box.innerHTML=l.map(function(h,i){
    return '<div class="rcard"><video src="'+h.url+'" muted preload="metadata" playsinline></video><div class="rc"><div class="rn">'+(h.name||'видео')+'</div><div class="rd">'+h.date+'</div><a href="'+h.url+'" target="_blank" rel="noopener">⬇ скачать</a> <button class="del" data-i="'+i+'" style="background:none;border:none;color:#fca5a5;cursor:pointer;font-size:.72rem">✕</button></div></div>';
  }).join('');
  box.querySelectorAll('.del').forEach(function(b){
    b.onclick=function(){ var l2=histLoad(); l2.splice(parseInt(b.getAttribute('data-i'),10),1); histSave(l2); histRender(); };
  });
}
function histPush(url,name){
  var l=histLoad();
  l.unshift({url:url,name:name,date:new Date().toLocaleDateString('ru-RU')});
  histSave(l); histRender();
}

function saveDraft(){
  if(restoring) return;
  try{
    localStorage.setItem('seedgen_gen_draft',JSON.stringify({
      prompt:promptText(),model:modelKey,enhance:enhance,orientation:orientation,quality:quality,seconds:seconds,refs:refs,savedAt:Date.now()
    }));
  }catch(e){}
}
(function restoreDraft(){
  try{
    var s=JSON.parse(localStorage.getItem('seedgen_gen_draft')||'null');
    if(!s) return;
    restoring=true;
    if(s.model&&MODELS[s.model]) modelKey=s.model;
    if(typeof s.enhance==='boolean') enhance=s.enhance;
    if(s.orientation) orientation=s.orientation;
    if(s.quality) quality=s.quality;
    if(s.seconds) seconds=s.seconds;
    refs=s.refs||[];
    restoring=false;
    if(s.prompt){ promptBox.textContent=s.prompt; }
    renderTiles();
  }catch(e){ restoring=false; renderTiles(); }
})();
promptBox.addEventListener('input',function(){ updateSteps(); updateSend(); updatePlaceholder(); saveDraft(); });

function callGenerate(pid){
  stage='gen';
  updateSteps(); updateSend();
  setStatus('Собираем кадры... 1–5 минут ⏳');
  fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    service:'text2video', paymentId:pid, prompt:promptText(),
    model:modelKey, enhancePrompt:enhance,
    seconds:seconds, quality:quality, aspect:orientation, refs:refs
  })})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.error){ throw new Error(d.error); }
      try{ localStorage.setItem('seedgen_gen_task_'+pid,d.taskId); }catch(e){}
      poll(d.taskId);
    })
    .catch(function(e){ setStatus('Ошибка: '+e.message); stage='setup'; updateSteps(); updateSend(); });
}
function poll(taskId){
  var timer=setInterval(function(){
    fetch('/api/status?taskId='+encodeURIComponent(taskId))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.status==='succeeded'){
          clearInterval(timer);
          document.getElementById('outbox').innerHTML='<div id="result"><video id="video" controls src="'+d.videoUrl+'"></video></div>';
          setStatus('Готово! ✅ Скачай видео в течение 7 дней.');
          histPush(d.videoUrl,promptText().slice(0,40)||'видео');
          stage='done'; updateSteps(); updateSend();
          try{ localStorage.removeItem('seedgen_gen_draft'); }catch(e){}
        }else if(d.status==='failed'){
          clearInterval(timer);
          setStatus('Ошибка: '+(d.error||'попробуй другой промпт'));
          stage='setup'; updateSteps(); updateSend();
        }else{
          setStatus('Собираем кадры... 1–5 минут ⏳');
        }
      })
      .catch(function(){});
  },5000);
}

function payClick(){
  if(paidSeen&&activePaymentId&&promptText()&&stage!=='gen'&&stage!=='done'){ callGenerate(activePaymentId); return; }
  if(!promptText()){ alert('Опиши сцену словами в поле выше'); return; }
  sendBtn.disabled=true;
  setStatus('Создаём платёж...');
  saveDraft();
  fetch('/api/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    service:'text2video', prompt:promptText(),
    model:modelKey, enhancePrompt:enhance,
    seconds:seconds, quality:quality
  })})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(data.error){ throw new Error(data.error); }
      activePaymentId=data.paymentId;
      saveDraft();
      window.location.href=data.confirmationUrl;
    })
    .catch(function(e){ setStatus('Ошибка: '+e.message); sendBtn.disabled=false; });
}
sendBtn.addEventListener('click',payClick);

(function(){
  var pid=new URLSearchParams(window.location.search).get('paymentId');
  if(!pid) return;
  activePaymentId=pid; paidSeen=true;
  var savedTask=localStorage.getItem('seedgen_gen_task_'+pid);
  if(savedTask){ stage='gen'; updateSteps(); updateSend(); setStatus('Собираем кадры... 1–5 минут ⏳'); poll(savedTask); return; }
  setStatus('Проверяем оплату...');
  fetch('/api/check-payment?paymentId='+encodeURIComponent(pid))
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(data.paid){
        saveDraft();
        if(promptText()){ setStatus('Оплата прошла! Запускаем генерацию...'); callGenerate(pid); }
        else{ setStatus('Оплата прошла! ✅ Опиши сцену и нажми ↑ ещё раз.'); updateSteps(); updateSend(); }
      }else{
        paidSeen=false; activePaymentId=null;
        setStatus('Оплата не завершена. Черновик сохранён — можешь оплатить ещё раз.');
        updateSteps(); updateSend();
      }
    })
    .catch(function(e){ paidSeen=false; setStatus('Ошибка: '+e.message); updateSteps(); updateSend(); });
})();

function syncUserMenu(){
  document.getElementById('rmAcc').textContent=token?'Мой кабинет':'Войти в кабинет';
  document.getElementById('rmOut').style.display=token?'flex':'none';
}
var rbUser=document.getElementById('rbUser'), rmenu=document.getElementById('rmenu');
rbUser.addEventListener('click',function(){ rmenu.classList.toggle('open'); syncUserMenu(); });
rmenu.querySelectorAll('button').forEach(function(b){
  b.addEventListener('click',function(){
    var act=b.getAttribute('data-act');
    rmenu.classList.remove('open');
    if(act==='account') location.href='/account.html';
    if(act==='help'){ var hf=document.getElementById('hwFloat'); if(hf) hf.click(); }
    if(act==='settings') alert('Настройки откроются после запуска: звук, язык интерфейса, уведомления.');
    if(act==='logout'){
      try{ localStorage.removeItem('seedgen_token'); localStorage.removeItem('yk_token'); }catch(e){}
      location.reload();
    }
  });
});
document.getElementById('rbToken').addEventListener('click',function(){ document.getElementById('shopMask').classList.add('open'); });
document.getElementById('shopClose').addEventListener('click',function(){ document.getElementById('shopMask').classList.remove('open'); });
document.getElementById('shopMask').addEventListener('click',function(e){ if(e.target===this) this.classList.remove('open'); });
document.getElementById('shopBuy').addEventListener('click',function(){ alert('Палыч открывает лавку в день запуска. Сейчас он только точит весы 🐭'); });

renderTiles();
histRender();
updateSteps();
updateSend();
updatePlaceholder();
syncUserMenu();
