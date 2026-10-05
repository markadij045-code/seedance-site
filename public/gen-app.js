function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarBackdrop').classList.toggle('open');
}

var STYLES=[
 ['real','🎬 Реалистичный'],
 ['cartoon','🎭 Мультяшный'],
 ['anime','🌸 Аниме'],
 ['noir','🌑 Нуар']
];
var styleId='real';
var orientation='9:16';
var refs=[];
var restoring=false, stage='setup', paidSeen=false, activePaymentId=null;
var sendBtn=document.getElementById('sendBtn'), statusEl=document.getElementById('status');
var promptBox=document.getElementById('promptBox'), pop=document.getElementById('popMenu'), studio=document.getElementById('stage');
var refPrev=document.getElementById('refPrev');
sendBtn.insertAdjacentHTML('beforeend','<span style="display:none">Оплатить</span>');
var token=''; try{ token=localStorage.getItem('seedgen_token')||localStorage.getItem('yk_token')||''; }catch(e){}
var popKind=null, popRect=null;

function setStatus(t){ statusEl.textContent=t; }
function styleName(){ for(var i=0;i<STYLES.length;i++){ if(STYLES[i][0]===styleId) return STYLES[i][1].replace(/^[^ ]+ /,''); } return 'Реалистичный'; }
function styleEmoji(){ for(var i=0;i<STYLES.length;i++){ if(STYLES[i][0]===styleId) return STYLES[i][1].split(' ')[0]; } return '🎬'; }

function promptText(){
  var c=promptBox.cloneNode(true);
  c.querySelectorAll('.reftile,.addbadge').forEach(function(e){ e.remove(); });
  return (c.textContent||'').replace(/\s+/g,' ').trim();
}

function updateChips(){
  document.getElementById('pcStyle').textContent=styleEmoji()+' '+styleName()+' ⌄';
  document.getElementById('pcRef').textContent='🖼 Референсы ('+refs.length+') ⌄';
  document.getElementById('pcFmt').textContent='📱 '+orientation+' ⌄';
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
  promptBox.querySelectorAll('.reftile,.addbadge').forEach(function(el){ el.remove(); });
  var rest=promptBox.firstChild;
  var nodes=[];
  refs.forEach(function(r,i){
    var t=document.createElement('span');
    t.className='reftile';
    t.title='Референс '+(i+1);
    t.innerHTML='<img src="data:image/jpeg;base64,'+r+'">';
    var x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='✕';
    x.onclick=function(ev){ ev.stopPropagation(); refs.splice(i,1); renderTiles(); saveDraft(); };
    t.appendChild(x);
    t.addEventListener('mouseenter',function(){ showRefPrev(i,t); });
    t.addEventListener('mouseleave',hideRefPrev);
    nodes.push(t);
  });
  var add=document.createElement('span');
  add.className='addbadge'; add.setAttribute('contenteditable','false');
  add.title='Добавить референс'; add.textContent='+';
  add.onclick=function(){ openPopEl(add,refPopHTML(),'ref',mountRefPop); };
  nodes.push(add);
  nodes.forEach(function(n){ promptBox.insertBefore(n,rest); });
  updateChips(); updateSteps(); updateSend();
}

function closePop(){ pop.classList.remove('open'); popKind=null; }
function openPop(rect,html,kind,mount){
  popKind=kind; popRect=rect; pop.innerHTML=html; pop.classList.add('open');
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

function stylePopHTML(){
  var h='<div class="pu-head">Стиль кадров</div>';
  STYLES.forEach(function(s){
    h+='<div class="pu-item" data-style="'+s[0]+'"><span class="nm">'+s[1]+'</span>'+(styleId===s[0]?'<span class="chk">✓</span>':'')+'</div>';
  });
  return h;
}
function mountStylePop(){
  pop.querySelectorAll('[data-style]').forEach(function(el){
    el.addEventListener('click',function(){
      styleId=el.getAttribute('data-style');
      closePop(); updateChips(); saveDraft();
    });
  });
}

function refPopHTML(){
  var h='<div class="pu-head">Референсы</div>';
  h+='<div class="pu-item" data-act="upload"><span class="mi">＋</span><span class="nm">Загрузить фото (своё или пресет)</span></div>';
  if(refs.length){
    h+='<div class="pu-head">Добавленные</div>';
    refs.forEach(function(r,i){
      h+='<div class="pu-item" data-del="'+i+'"><img src="data:image/jpeg;base64,'+r+'"><span class="nm">Референс '+(i+1)+'</span><span class="chk" style="color:#fca5a5">✕</span></div>';
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

function fmtPopHTML(){
  return '<div class="pu-lbl">Формат кадра</div><div class="pu-row" id="puOr">'+['9:16','16:9','1:1'].map(function(a){ return '<button type="button" data-or="'+a+'" class="'+(a===orientation?'on':'')+'">'+a+'</button>'; }).join('')+'</div>';
}
function mountFmtPop(){
  pop.querySelectorAll('#puOr button').forEach(function(b){ b.addEventListener('click',function(){ orientation=b.getAttribute('data-or'); closePop(); updateChips(); saveDraft(); }); });
}

document.getElementById('pcStyle').addEventListener('click',function(){ openPopEl(this,stylePopHTML(),'style',mountStylePop); });
document.getElementById('pcRef').addEventListener('click',function(){ openPopEl(this,refPopHTML(),'ref',mountRefPop); });
document.getElementById('pcFmt').addEventListener('click',function(){ openPopEl(this,fmtPopHTML(),'fmt',mountFmtPop); });

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
    if(f.type.indexOf('image/')!==0){ done++; return; }
    if(f.size>10*1024*1024){ done++; return; }
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
      prompt:promptText(),style:styleId,orientation:orientation,refs:refs,savedAt:Date.now()
    }));
  }catch(e){}
}
(function restoreDraft(){
  try{
    var s=JSON.parse(localStorage.getItem('seedgen_gen_draft')||'null');
    if(!s) return;
    restoring=true;
    if(s.style) styleId=s.style;
    if(s.orientation) orientation=s.orientation;
    refs=s.refs||[];
    restoring=false;
    if(s.prompt){ promptBox.textContent=s.prompt; }
    renderTiles();
  }catch(e){ restoring=false; renderTiles(); }
})();
promptBox.addEventListener('input',function(){ updateSteps(); updateSend(); saveDraft(); });

function callGenerate(pid){
  stage='gen';
  updateSteps(); updateSend();
  setStatus('Собираем кадры... 1–5 минут ⏳');
  fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'gen',paymentId:pid,prompt:promptText(),style:styleId,refs:refs,aspect:orientation})})
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
  fetch('/api/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'gen'})})
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
syncUserMenu();
