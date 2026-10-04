(function(){
'use strict';
var DRAFT_KEY='yk_gen_draft', HIST_KEY='yk_gen_history';
(function(){ try{
  if(!localStorage.getItem(DRAFT_KEY)&&localStorage.getItem('seedgen_gen_draft')){ localStorage.setItem(DRAFT_KEY,localStorage.getItem('seedgen_gen_draft')); localStorage.removeItem('seedgen_gen_draft'); }
  if(!localStorage.getItem(HIST_KEY)&&localStorage.getItem('seedgen_gen_history')){ localStorage.setItem(HIST_KEY,localStorage.getItem('seedgen_gen_history')); localStorage.removeItem('seedgen_gen_history'); }
}catch(e){} })();

var css=document.createElement('style');
css.textContent=''
+'.refstack{display:inline-block;vertical-align:middle;margin:0 12px 6px 0}'
+'.refstack .reftile{margin-left:-34px;transition:margin-left .25s ease}'
+'.refstack .reftile:first-child{margin-left:0}'
+'.refstack:hover .reftile{margin-left:6px}'
+'.durb{position:absolute;left:3px;bottom:3px;background:rgba(0,0,0,.78);color:#fff;font-size:.6rem;padding:1px 4px;border-radius:4px;z-index:2}'
+'.refprev{position:absolute;z-index:130;background:#0c0f0a;border:1px solid var(--border-lime);border-radius:12px;padding:8px;box-shadow:0 12px 32px rgba(0,0,0,.6);display:none;width:240px}'
+'.refprev.open{display:block}'
+'.refprev video,.refprev img{width:100%;border-radius:8px;display:block;background:#000}'
+'.refprev .ap{display:flex;gap:10px;align-items:center;color:#93c5fd;font-size:.82rem;padding:6px 4px}'
+'.refprev .ap button{width:34px;height:34px;border-radius:50%;border:1px solid rgba(59,130,246,.5);background:rgba(59,130,246,.12);color:#93c5fd;cursor:pointer;flex:0 0 auto}'
+'.mgrbtn{display:inline-block;vertical-align:middle;margin:0 10px 6px 0;padding:5px 11px;border-radius:999px;border:1px solid var(--border);background:rgba(255,255,255,.06);color:#d1d5db;font:600 .75rem \'Inter\';cursor:pointer}'
+'.mgrbtn:hover{background:rgba(255,255,255,.12);color:#fff}'
+'.popup.wide{min-width:320px;max-width:430px}'
+'.mgr-tabs{display:flex;gap:4px;padding:6px 8px;flex-wrap:wrap}'
+'.mgr-tabs button{padding:6px 10px;border-radius:8px;border:none;background:none;color:var(--muted);font:600 .78rem \'Inter\';cursor:pointer}'
+'.mgr-tabs button.on{background:rgba(255,255,255,.08);color:#fff}'
+'.mgr-grid{display:flex;gap:8px;flex-wrap:wrap;padding:8px}'
+'.mgr-tile{position:relative;width:52px;height:52px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:#000}'
+'.mgr-tile img{width:100%;height:100%;object-fit:cover}'
+'.mgr-tile .ic{position:absolute;inset:0;display:grid;place-items:center;font-size:.9rem;color:var(--lime);background:rgba(163,230,53,.12)}'
+'.mgr-tile.audio .ic{color:#93c5fd;background:rgba(59,130,246,.12)}'
+'.mgr-tile.video .ic{color:#fdba74;background:rgba(251,146,60,.12)}'
+'.mgr-tile .x{position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;border:none;background:rgba(0,0,0,.8);color:#fca5a5;font-size:.6rem;cursor:pointer;display:grid;place-items:center;line-height:1;padding:0}'
+'.mgr-foot{display:flex;justify-content:flex-end;padding:6px 8px}'
+'.mgr-foot button{padding:7px 12px;border-radius:8px;border:1px solid rgba(252,165,165,.4);background:none;color:#fca5a5;font:600 .78rem \'Inter\';cursor:pointer}';
document.head.appendChild(css);

// === НОВАЯ ЛОГИКА: 4 МОДЕЛИ С ЦЕНАМИ ===
var MODELS = {
  'wan-3.0': {
    name: 'Wan 3.0',
    description: 'быстро и дёшево',
    basePrice: 99,
    perSecond: 10,
    maxDuration: 30,
    apiModel: 'wan3.0'
  },
  'kling-standard': {
    name: 'Kling',
    description: 'народный, со звуком',
    basePrice: 129,
    perSecond: 15,
    maxDuration: 10,
    apiModel: 'kling-standard'
  },
  'seedance-2.0': {
    name: 'Seedance 2.0',
    description: 'баланс цены и качества',
    basePrice: 129,
    perSecond: 15,
    maxDuration: 15,
    apiModel: 'seedance-2.0'
  },
  'seedance-2.5': {
    name: 'Seedance 2.5',
    description: 'флагман: максимум качества',
    basePrice: 199,
    perSecond: 30,
    maxDuration: 30,
    apiModel: 'seedance-2.5'
  }
};

var SURCHARGE={'480p':0,'720p':200,'1080p':300};
var currentModel = 'seedance-2.5'; // По умолчанию флагман
var enhancePrompt = true; // Простой режим по умолчанию
var seconds=5, aspect='16:9', quality='480p', refs=[], restoring=false, stage='setup', paidSeen=false, baseDone=false, upscaleExpected=false;
var btn=document.getElementById('btn'), sendBtn=document.getElementById('sendBtn'), statusEl=document.getElementById('status');
var promptBox=document.getElementById('promptBox'), pop=document.getElementById('popMenu'), studio=document.querySelector('.studio'), uplInput=document.getElementById('uplInput');
var pcMode=document.getElementById('pcMode'), pcModel=document.getElementById('pcModel'), pcFQ=document.getElementById('pcFQ'), pcDur=document.getElementById('pcDur'), pcAt=document.getElementById('pcAt');
sendBtn.insertAdjacentHTML('beforeend','<span style="display:none">Оплатить</span>');
var prev=document.createElement('div'); prev.className='refprev'; studio.appendChild(prev);
var popKind=null, popRect=null, mSel=0, mgrTab='all', prevAudio=null;

function setStatus(t){ statusEl.textContent=t; }
function refName(i,kind){ if(kind==='image')return 'Image'+(i+1); if(kind==='video')return 'Video1'; if(kind==='audio')return 'Audio1'; return 'Ref'+(i+1); }
function shortName(n){ n=n||'файл'; return n.length>18? n.slice(0,17)+'…': n; }
function fmtDur(s){ if(!s&&s!==0) return ''; s=Math.round(s); var m=Math.floor(s/60), ss=s%60; return m+':'*(m>0)+(m>0?(ss<10?'0':'')+ss:ss+''); }

// === ОБНОВЛЁННАЯ ЛОГИКА ЦЕН ===
function updateChips(){ 
  var model = MODELS[currentModel];
  pcModel.textContent='⚙ '+model.name+' ⌄';
  pcFQ.textContent=aspect+' · '+quality+' ⌄'; 
  pcDur.textContent=seconds+' сек ⌄'; 
}

function updatePriceDisplay(){ 
  var model = MODELS[currentModel];
  var basePrice = model.basePrice;
  var extraSeconds = Math.max(0, seconds - 5);
  var p = basePrice + (extraSeconds * model.perSecond) + SURCHARGE[quality]; 
  document.getElementById('priceVal').textContent=p; 
  document.getElementById('barPrice').textContent=p; 
  document.getElementById('barMeta').textContent=seconds+' сек · '+quality; 
  btn.textContent='Создать видео — '+p+' ₽'; 
  updateChips(); 
}

function getPromptText(){ var out=''; promptBox.childNodes.forEach(function(n){ if(n.nodeType===3){ out+=n.nodeValue; } else if(n.nodeType===1){ if(n.classList.contains('mchip')){ out+='@'+n.getAttribute('data-ref'); } else if(n.tagName==='BR'){ out+='\n'; } else if(!n.classList.contains('reftile')&&!n.classList.contains('addbadge')&&!n.classList.contains('refstack')&&!n.classList.contains('mgrbtn')){ out+=n.textContent; } } }); return out.replace(/\u00A0/g,' '); }
function updateSteps(){ var ok=getPromptText().trim().length>0; var s1=document.getElementById('st1'),s2=document.getElementById('st2'),s3=document.getElementById('st3'); s1.className='pstep'+(ok?' done':' active'); s2.className='pstep'+(paidSeen?' done':(ok?' active':'')); s3.className='pstep'+(stage==='done'?' done':(paidSeen?' active':'')); var tp=document.getElementById('tlPay'),tg=document.getElementById('tlGen'),tu=document.getElementById('tlUp'); tp.className='tl-item'+(paidSeen?' done':(ok?' now':'')); tg.className='tl-item'+(baseDone?' done':(stage==='gen'?' now':'')); tu.style.display=upscaleExpected?'flex':'none'; tu.className='tl-item'+(stage==='done'&&upscaleExpected?' done':(stage==='up'?' now':'')); }

function buildMchip(r,i){ var name=r._name||refName(i,r.kind); var c=document.createElement('span'); c.className='mchip'+(r.kind!=='image'?' '+r.kind:''); c.setAttribute('contenteditable','false'); c.setAttribute('data-ref',name); if(r.kind==='image'){ var im=document.createElement('img'); im.src=r.thumb||('data:image/jpeg;base64,'+r.data); c.appendChild(im); } else { var mi=document.createElement('span'); mi.className='mi'; mi.textContent=(r.kind==='video'?'▶':'♪'); c.appendChild(mi); } var mn=document.createElement('span'); mn.className='mn'; mn.textContent=shortName(r.name||name); c.appendChild(mn); return c; }

function hidePrev(){ prev.classList.remove('open'); if(prevAudio){ try{ prevAudio.pause(); }catch(e){} prevAudio=null; } prev.innerHTML=''; }
function showPrev(r,el){ hidePrev(); var html=''; if(r.kind==='image'){ html='<img src="'+(r.thumb||('data:image/jpeg;base64,'+r.data))+'">'; } else if(r.kind==='video'){ html='<video src="'+r.data+'" muted autoplay loop playsinline></video>'; } else { html='<div class="ap"><button type="button" id="prevPlay">▶</button><span>'+shortName(r.name||'звук')+'</span></div>'; } prev.innerHTML=html; prev.classList.add('open'); var s=studio.getBoundingClientRect(), t=el.getBoundingClientRect(); var left=t.left-s.left; if(left+240>s.width-8) left=Math.max(8,s.width-248); prev.style.left=left+'px'; prev.style.top='0px'; var h=prev.offsetHeight; var top=t.top-s.top-h-10; if(top< -40) top=t.bottom-s.top+10; prev.style.top=top+'px'; if(r.kind==='audio'){ var b=prev.querySelector('#prevPlay'); var au=new Audio(r.data); prevAudio=au; b.onclick=function(){ if(au.paused){ au.play(); b.textContent='❚'; } else { au.pause(); b.textContent='▶'; } }; au.onended=function(){ b.textContent='▶'; }; } }

function renderRefs(){ promptBox.querySelectorAll('.refstack,.addbadge,.mgrbtn').forEach(function(el){ el.remove(); }); var rest=promptBox.firstChild; var nodes=[]; if(refs.length){ var stack=document.createElement('span'); stack.className='refstack'; stack.setAttribute('contenteditable','false'); refs.forEach(function(r,i){ var name=refName(i,r.kind); r._name=name; var t=document.createElement('span'); t.className='reftile'+(r.kind!=='image'?' '+r.kind:''); t.title=name+' · '+shortName(r.name); if(r.kind==='image'){ var im=document.createElement('img'); im.src=r.thumb||('data:image/jpeg;base64,'+r.data); t.appendChild(im); } else { var ic=document.createElement('span'); ic.className='ic'; ic.textContent=(r.kind==='video'?'▶':'♪'); t.appendChild(ic); } if(r.dur){ var db=document.createElement('span'); db.className='durb'; db.textContent=fmtDur(r.dur); t.appendChild(db); } var x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='✕'; x.onclick=function(ev){ ev.stopPropagation(); refs.splice(i,1); renderRefs(); saveDraft(); }; t.appendChild(x); t.addEventListener('mouseenter',function(){ showPrev(r,t); }); t.addEventListener('mouseleave',hidePrev); stack.appendChild(t); }); nodes.push(stack); } var add=document.createElement('span'); add.className='addbadge'; add.setAttribute('contenteditable','false'); add.title='Загрузить фото, видео или звук'; add.textContent='+'; add.onclick=function(){ uplInput.click(); }; nodes.push(add); if(refs.length>4){ var mb=document.createElement('span'); mb.className='mgrbtn'; mb.setAttribute('contenteditable','false'); mb.textContent='📎 Все ('+refs.length+') ⌄'; mb.onclick=function(){ openPopEl(mb, mgrHTML(mgrTab), 'mgr', mountMgr); }; nodes.push(mb); } nodes.forEach(function(n){ promptBox.insertBefore(n, rest); }); }

function fileToRefBase64(f,cb){ var rd=new FileReader(); rd.onload=function(){ var img=new Image(); img.onload=function(){ var max=1024,w=img.width,h=img.height; if(w>max||h>max){ var k=Math.min(max/w,max/h); w=Math.round(w*k); h=Math.round(h*k); } var c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); cb(c.toDataURL('image/jpeg',0.85).split(',')[1]); }; img.src=rd.result; }; rd.readAsDataURL(f); }
function makeThumb(b64,cb){ var img=new Image(); img.onload=function(){ var max=80,w=img.width,h=img.height; if(w>max||h>max){ var k=Math.min(max/w,max/h); w=Math.round(w*k); h=Math.round(h*k); } var c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); cb(c.toDataURL('image/jpeg',0.7)); }; img.src='data:image/jpeg;base64,'+b64; }
function probeMedia(f,maxSec,cb){ var url=URL.createObjectURL(f); var el=(f.type.indexOf('video/')===0)?document.createElement('video'):new Audio(); el.preload='metadata'; el.onloadedmetadata=function(){ var d=el.duration; URL.revokeObjectURL(url); if(d>maxSec){ alert('Файл длиннее '+maxSec+' секунд. Выбери короче.'); cb(null); return; } cb(d); }; el.onerror=function(){ URL.revokeObjectURL(url); cb(0); }; el.src=url; }
function safeName(p,f,ext){ return p+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+ext; }
function uploadRef(f,kind,cb){ if(!window.blobUpload){ alert('Загрузка ещё готовится — подожди пару секунд и попробуй снова.'); return; } setStatus('Загружаем '+(kind==='video'?'видео':'звук')+'...'); window.blobUpload(safeName('gen-ref-'+kind,f,kind==='video'?'.mp4':'.mp3'), f, {access:'public'}).then(function(b){ setStatus(''); cb(b.url); }).catch(function(err){ setStatus(''); alert('Не удалось загрузить файл: '+err.message); }); }
function addRef(kind,data,name,dur){ if(kind==='image'){ if(refs.filter(function(r){return r.kind==='image';}).length>=10){ alert('Лимит фото-референсов: 10'); return false; } } else if(kind==='video'){ if(refs.some(function(r){return r.kind==='video';})){ alert('Можно только одно видео'); return false; } } else if(kind==='audio'){ if(refs.some(function(r){return r.kind==='audio';})){ alert('Можно только один звук'); return false; } } refs.push({kind:kind,data:data,name:name||'',dur:dur}); renderRefs(); saveDraft(); return true; }

uplInput.addEventListener('change', function(e){ var files=Array.prototype.slice.call(e.target.files); var idx=0; (function next(){ if(idx>=files.length) return; var f=files[idx++]; if(f.type.indexOf('image/')===0){ fileToRefBase64(f,function(b64){ makeThumb(b64,function(th){ if(addRef('image',b64,f.name)){ refs[refs.length-1].thumb=th; renderRefs(); saveDraft(); } next(); }); }); } else if(f.type.indexOf('video/')===0){ probeMedia(f,15,function(d){ if(d===null){ next(); return; } uploadRef(f,'video',function(url){ addRef('video',url,f.name,d); next(); }); }); } else if(f.type.indexOf('audio/')===0){ probeMedia(f,15,function(d){ if(d===null){ next(); return; } uploadRef(f,'audio',function(url){ addRef('audio',url,f.name,d); next(); }); }); } else { alert('Поддерживаются фото, видео и аудио'); next(); } })(); e.target.value=''; });

function openPop(rect,html,kind,mount){ popKind=kind; popRect=rect; pop.innerHTML=html; pop.classList.toggle('wide', kind==='mgr'); pop.classList.add('open'); var s=studio.getBoundingClientRect(); var top=rect.bottom-s.top+6, left=rect.left-s.left; pop.style.top=top+'px'; pop.style.left='0px'; var w=pop.offsetWidth, sw=s.width; if(left+w>sw-8) left=Math.max(8,sw-w-8); pop.style.left=left+'px'; if(mount) mount(); }
function openPopEl(el,html,kind,mount){ openPop(el.getBoundingClientRect(),html,kind,mount); }
function closePop(){ pop.classList.remove('open'); pop.classList.remove('wide'); popKind=null; }
document.addEventListener('mousedown', function(e){ if(!pop.contains(e.target)) closePop(); });
document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closePop(); hidePrev(); } });

function popModeHTML(){ var items=[['/gen.html','🎬 Видео из текста',1],['/cartoon.html','🎭 Мультфильм из фото',0],['/avatar.html','🗣 Говорящий аватар',0],['/motion.html','🕺 Моушен контроль',0],['/lipsync.html','🎤 Липсинк / дубляж',0]]; return '<div class="pu-head">Режим создания</div>'+items.map(function(it){ return '<div class="pu-item" data-href="'+it[0]+'"><span class="nm">'+it[1]+'</span>'+(it[2]?'<span class="chk">✓</span>':'')+'</div>'; }).join(''); }
function mountMode(){ pop.querySelectorAll('.pu-item').forEach(function(el){ el.addEventListener('click', function(){ location.href=el.getAttribute('data-href'); }); }); }

// === ОБНОВЛЁННОЕ МЕНЮ МОДЕЛЕЙ ===
function popModelHTML(){ 
  var html = '<div class="pu-head">Выбери движок генерации</div>';
  Object.keys(MODELS).forEach(function(key){
    var m = MODELS[key];
    var isSelected = currentModel === key;
    var priceText = 'от '+m.basePrice+' ₽';
    html += '<div class="pu-item'+(isSelected?' sel':'')+'" data-model="'+key+'">';
    html += '<span class="nm">'+m.name+' <small style="color:var(--muted)">— '+m.description+'</small></span>';
    html += '<span style="margin-left:auto;font-weight:700;color:var(--lime)">'+priceText+'</span>';
    if(isSelected) html += '<span class="chk" style="margin-left:8px">✓</span>';
    html += '</div>';
  });
  // Серые "скоро"
  html += '<div class="pu-item" style="opacity:.5;cursor:default"><span class="nm">Kling 4.0 <small style="color:#fbbf24">— новинка октября, скоро</small></span></div>';
  html += '<div class="pu-item" style="opacity:.5;cursor:default"><span class="nm">Veo 4 <small style="color:#fbbf24">— скоро</small></span></div>';
  return html;
}

function mountModel(){ 
  pop.querySelectorAll('.pu-item[data-model]').forEach(function(el){ 
    el.addEventListener('click', function(){ 
      var modelKey = el.getAttribute('data-model');
      currentModel = modelKey;
      var model = MODELS[modelKey];
      // Ограничиваем длительность максимумом модели
      if(seconds > model.maxDuration){
        seconds = model.maxDuration;
      }
      updatePriceDisplay();
      saveDraft();
      closePop();
    }); 
  }); 
}

// === ОБНОВЛЁННОЕ МЕНЮ РЕЖИМОВ (ПРОМПТ) ===
function popEnhanceHTML(){
  return '<div class="pu-head">Режим обработки промпта</div>'
    + '<div class="pu-item'+(enhancePrompt?' sel':'')+'" data-enhance="true"><span class="nm">Простой — AI улучшит промпт</span>'+(enhancePrompt?'<span class="chk">✓</span>':'')+'</div>'
    + '<div class="pu-item'+(!enhancePrompt?' sel':'')+'" data-enhance="false"><span class="nm">Продвинутый — промпт без изменений</span>'+(!enhancePrompt?'<span class="chk">✓</span>':'')+'</div>'
    + '<div style="padding:10px;color:var(--muted);font-size:.78rem;line-height:1.5;border-top:1px solid var(--border);margin-top:8px">Простой режим: промпт переводится и дополняется для лучшего результата. Продвинутый: промпт уходит как есть (для опытных).</div>';
}

function mountEnhance(){
  pop.querySelectorAll('.pu-item[data-enhance]').forEach(function(el){
    el.addEventListener('click', function(){
      enhancePrompt = el.getAttribute('data-enhance') === 'true';
      closePop();
    });
  });
}

function popFQHTML(){ return '<div class="pu-lbl">Формат кадра</div><div class="pu-row" id="puAsp">'+['16:9','9:16','1:1'].map(function(a){ return '<button type="button" data-a="'+a+'" class="'+(a===aspect?'on':'')+'">'+a+'</button>'; }).join('')+'</div><div class="pu-lbl">Качество</div><div class="pu-row" id="puQ">'+['480p','720p','1080p'].map(function(q){ var lbl=q+(q==='720p'?' · +200 ₽':(q==='1080p'?' · +300 ₽':'')); return '<button type="button" data-q="'+q+'" class="'+(q===quality?'on':'')+'">'+lbl+'</button>'; }).join('')+'</div>'; }
function mountFQ(){ pop.querySelectorAll('#puAsp button').forEach(function(b){ b.addEventListener('click', function(){ aspect=b.getAttribute('data-a'); updateChips(); saveDraft(); openPop(popRect,popFQHTML(),'fq',mountFQ); }); }); pop.querySelectorAll('#puQ button').forEach(function(b){ b.addEventListener('click', function(){ quality=b.getAttribute('data-q'); updatePriceDisplay(); saveDraft(); openPop(popRect,popFQHTML(),'fq',mountFQ); }); }); }

// === ОБНОВЛЁННОЕ МЕНЮ ДЛИТЕЛЬНОСТИ ===
function popDurHTML(){ 
  var model = MODELS[currentModel];
  var maxDur = model.maxDuration;
  var currentSec = Math.min(seconds, maxDur);
  return '<div class="pu-lbl">Длительность (макс '+maxDur+' сек для '+model.name+')</div><div class="pu-dur"><input type="range" id="puSlider" min="5" max="'+maxDur+'" step="1" value="'+currentSec+'"><span id="puVal">'+currentSec+' сек</span></div>'; 
}
function mountDur(){ 
  var sl=pop.querySelector('#puSlider'), vv=pop.querySelector('#puVal'); 
  sl.addEventListener('input', function(){ 
    seconds=parseInt(sl.value,10); 
    vv.textContent=seconds+' сек'; 
    updatePriceDisplay(); 
    saveDraft(); 
    updateSteps(); 
  }); 
}

function popMentionHTML(){ var h='<div class="pu-head">Используй @ для упоминания</div><div class="pu-item pu-add" id="puAdd"><span class="nm">+ Добавить файл</span></div>'; if(!refs.length){ h+='<div class="pu-head" style="padding:8px 10px">Пока пусто: загрузи фото, видео или звук</div>'; } else { mSel=0; h+=refs.map(function(r,i){ var cls='pu-item'+(r.kind!=='image'?' '+r.kind:'')+(i===mSel?' sel':''); var ic=r.kind==='image'?'<img src="'+(r.thumb||('data:image/jpeg;base64,'+r.data))+'">':'<span class="mi">'+(r.kind==='video'?'▶':'♪')+'</span>'; return '<div class="'+cls+'" data-i="'+i+'">'+ic+'<span class="nm">'+shortName(r.name||(r._name||refName(i,r.kind)))+'</span></div>'; }).join(''); } return h; }
function mountMention(){ var add=pop.querySelector('#puAdd'); if(add) add.addEventListener('click', function(){ closePop(); uplInput.click(); }); pop.querySelectorAll('.pu-item[data-i]').forEach(function(el){ el.addEventListener('mousedown', function(e){ e.preventDefault(); }); el.addEventListener('mouseenter', function(){ mSel=parseInt(el.getAttribute('data-i'),10); pop.querySelectorAll('.pu-item[data-i]').forEach(function(x,j){ x.classList.toggle('sel', j===mSel); }); }); el.addEventListener('click', function(){ insertMention(parseInt(el.getAttribute('data-i'),10)); }); }); }

function mgrHTML(tab){ var cnt={all:refs.length, image:0, video:0, audio:0}; refs.forEach(function(r){ cnt[r.kind]++; }); var tabs=[['all','Все ('+cnt.all+')'],['image','Фото ('+cnt.image+')'],['video','Видео ('+cnt.video+')'],['audio','Звук ('+cnt.audio+')']]; var h='<div class="pu-head">Референсы</div><div class="mgr-tabs">'+tabs.map(function(t){ return '<button type="button" data-t="'+t[0]+'" class="'+(t[0]===tab?'on':'')+'">'+t[1]+'</button>'; }).join('')+'</div><div class="mgr-grid">'; var shown=0; refs.forEach(function(r,i){ if(tab!=='all'&&r.kind!==tab) return; shown++; var inner=r.kind==='image'?'<img src="'+(r.thumb||('data:image/jpeg;base64,'+r.data))+'">':'<span class="ic">'+(r.kind==='video'?'▶':'♪')+'</span>'; h+='<div class="mgr-tile '+r.kind+'" data-i="'+i+'" title="'+shortName(r.name||refName(i,r.kind))+'">'+inner+'<button type="button" class="x" data-i="'+i+'">✕</button></div>'; }); if(!shown) h+='<div class="pu-head" style="padding:6px">В этой вкладке пусто</div>'; h+='</div><div class="mgr-foot"><button type="button" id="mgrClear">Убрать все</button></div>'; return h; }
function mountMgr(){ pop.querySelectorAll('.mgr-tabs button').forEach(function(b){ b.addEventListener('click', function(){ mgrTab=b.getAttribute('data-t'); openPop(popRect, mgrHTML(mgrTab), 'mgr', mountMgr); }); }); pop.querySelectorAll('.mgr-tile .x').forEach(function(x){ x.addEventListener('click', function(ev){ ev.stopPropagation(); var i=parseInt(x.getAttribute('data-i'),10); refs.splice(i,1); renderRefs(); saveDraft(); openPop(popRect, mgrHTML(mgrTab), 'mgr', mountMgr); }); }); var cl=pop.querySelector('#mgrClear'); if(cl) cl.addEventListener('click', function(){ if(confirm('Убрать все референсы? Черновик текста останется.')){ refs=[]; renderRefs(); saveDraft(); closePop(); } }); }

function caretRect(){ var sel=window.getSelection(); if(sel&&sel.rangeCount){ var r=sel.getRangeAt(0).getBoundingClientRect(); if(r&&(r.top||r.left||r.bottom)) return r; } var b=promptBox.getBoundingClientRect(); return {bottom:b.top+40,left:b.left+8}; }
function insertMention(i){ var r=refs[i]; if(!r) return; promptBox.focus(); var sel=window.getSelection(); var range; if(sel.rangeCount&&promptBox.contains(sel.getRangeAt(0).startContainer)){ range=sel.getRangeAt(0); } else { range=document.createRange(); range.selectNodeContents(promptBox); range.collapse(false); } var node=range.startContainer, off=range.startOffset; if(node.nodeType===3&&off>0&&node.nodeValue[off-1]==='@'){ node.nodeValue=node.nodeValue.slice(0,off-1)+node.nodeValue.slice(off); range.setStart(node,off-1); range.collapse(true); } var chip=buildMchip(r,i); range.insertNode(chip); var sp=document.createTextNode(' '); chip.after(sp); range.setStartAfter(sp); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); closePop(); saveDraft(); updateSteps(); }

pcMode.addEventListener('click', function(){ openPopEl(pcMode,popModeHTML(),'mode',mountMode); });
pcModel.addEventListener('click', function(){ openPopEl(pcModel,popModelHTML(),'model',mountModel); });
pcFQ.addEventListener('click', function(){ openPopEl(pcFQ,popFQHTML(),'fq',mountFQ); });
pcDur.addEventListener('click', function(){ openPopEl(pcDur,popDurHTML(),'dur',mountDur); });
pcAt.addEventListener('click', function(){ promptBox.focus(); var sel=window.getSelection(); var range=document.createRange(); range.selectNodeContents(promptBox); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); openPopEl(pcAt,popMentionHTML(),'mention',mountMention); });

// === ДОБАВЛЯЕМ КНОПКУ РЕЖИМОВ В STUDIO-BAR ===
(function(){
  var modeBtn = document.createElement('button');
  modeBtn.className = 'pchip';
  modeBtn.type = 'button';
  modeBtn.id = 'pcEnhance';
  modeBtn.textContent = enhancePrompt ? '✨ Простой режим ⌄' : '🔧 Продвинутый ⌄';
  modeBtn.addEventListener('click', function(){
    openPopEl(modeBtn, popEnhanceHTML(), 'enhance', mountEnhance);
  });
  // Вставляем перед кнопкой @
  pcAt.parentNode.insertBefore(modeBtn, pcAt);
  
  // Обновляем текст кнопки при изменении режима
  window.addEventListener('popstate', function(){
    modeBtn.textContent = enhancePrompt ? '✨ Простой режим ⌄' : '🔧 Продвинутый ⌄';
  });
})();

// Функция для обновления кнопки режима (вызывается после mountEnhance)
function updateEnhanceButton(){
  var modeBtn = document.getElementById('pcEnhance');
  if(modeBtn){
    modeBtn.textContent = enhancePrompt ? '✨ Простой режим ⌄' : '🔧 Продвинутый ⌄';
  }
}

// Переопределяем mountEnhance чтобы обновлять кнопку
var originalMountEnhance = mountEnhance;
mountEnhance = function(){
  originalMountEnhance();
  pop.querySelectorAll('.pu-item[data-enhance]').forEach(function(el){
    el.addEventListener('click', function(){
      enhancePrompt = el.getAttribute('data-enhance') === 'true';
      updateEnhanceButton();
      closePop();
    });
  });
};

promptBox.addEventListener('input', function(){ saveDraft(); updateSteps(); var sel=window.getSelection(); if(!sel.rangeCount){ return; } var range=sel.getRangeAt(0); var node=range.startContainer, off=range.startOffset; if(node.nodeType===3&&off>0&&node.nodeValue[off-1]==='@'){ openPop(caretRect(),popMentionHTML(),'mention',mountMention); } else if(popKind==='mention'){ closePop(); } });
promptBox.addEventListener('keydown', function(e){ if(popKind!=='mention') return; var items=pop.querySelectorAll('.pu-item[data-i]'); if(!items.length) return; if(e.key==='ArrowDown'){ e.preventDefault(); mSel=Math.min(mSel+1,items.length-1); items.forEach(function(x,j){ x.classList.toggle('sel',j===mSel); }); } else if(e.key==='ArrowUp'){ e.preventDefault(); mSel=Math.max(mSel-1,0); items.forEach(function(x,j){ x.classList.toggle('sel',j===mSel); }); } else if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); insertMention(mSel); } });

function histLoad(){ try{ return JSON.parse(localStorage.getItem(HIST_KEY)||'[]'); }catch(e){ return []; } }
function histSave(l){ try{ localStorage.setItem(HIST_KEY, JSON.stringify(l.slice(0,10))); }catch(e){} }
function histRender(){ var l=histLoad(); var box=document.getElementById('histList'); document.getElementById('histCount').textContent=l.length?('всего '+l.length):''; if(!l.length){ box.innerHTML='<div class="hempty">Пока пусто. Готовые ролики будут собираться здесь (в этом браузере). После переезда история станет общей для всех устройств.</div>'; return; } box.innerHTML=l.map(function(h,i){ return '<div class="hitem"><div style="flex:1;min-width:0"><div class="ht">'+(h.name||'видео')+'</div><div class="hd">'+h.date+'</div></div><a href="'+h.url+'" target="_blank" rel="noopener">▶ скачать</a><button class="del" data-i="'+i+'">✕</button></div>'; }).join(''); box.querySelectorAll('.del').forEach(function(b){ b.onclick=function(){ var l2=histLoad(); l2.splice(parseInt(b.getAttribute('data-i'),10),1); histSave(l2); histRender(); }; }); }
function histPush(url,name){ var l=histLoad(); l.unshift({url:url,name:name,date:new Date().toLocaleDateString('ru-RU')}); histSave(l); histRender(); }

function saveDraft(){ if(restoring) return; try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({ prompt:getPromptText(), refs:refs.map(function(r){ return {kind:r.kind,data:r.data,name:r.name,thumb:r.thumb,dur:r.dur}; }), aspect:aspect, seconds:seconds, quality:quality, model:currentModel, enhance:enhancePrompt, savedAt:Date.now() })); }catch(e){} }
function setTextWithTokens(text){ promptBox.textContent=''; var parts=text.split(/(@(?:Image\d+|Video1|Audio1))/g); parts.forEach(function(p){ if(!p) return; var m=p.match(/^@(Image\d+|Video1|Audio1)$/); if(m){ var idx=-1; for(var i=0;i<refs.length;i++){ if(refs[i]._name===m[1]){ idx=i; break; } } if(idx>=0){ promptBox.appendChild(buildMchip(refs[idx],idx)); promptBox.appendChild(document.createTextNode(' ')); } else { promptBox.appendChild(document.createTextNode(p)); } } else { promptBox.appendChild(document.createTextNode(p)); } }); }
(function restoreDraft(){ try{ var s=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); if(!s) return; restoring=true; if(s.aspect) aspect=s.aspect; if(s.seconds&&s.seconds>=5&&s.seconds<=30) seconds=s.seconds; if(s.quality&&SURCHARGE[s.quality]!==undefined) quality=s.quality; if(s.model && MODELS[s.model]) currentModel=s.model; if(s.enhance!==undefined) enhancePrompt=s.enhance; if(s.refs&&s.refs.length){ s.refs.forEach(function(r){ refs.push({kind:r.kind,data:r.data,name:r.name,thumb:r.thumb,dur:r.dur}); }); } renderRefs(); if(s.prompt) setTextWithTokens(s.prompt); restoring=false; updatePriceDisplay(); updateSteps(); updateEnhanceButton(); }catch(e){ restoring=false; renderRefs(); updatePriceDisplay(); updateSteps(); updateEnhanceButton(); } })();

// === ОБНОВЛЁННАЯ ЛОГИКА ОПЛАТЫ С ПЕРЕДАЧЕЙ МОДЕЛИ И РЕЖИМА ===
function payClick(){ 
  var prompt=getPromptText().trim(); 
  if(!prompt){ alert('Опиши видео или добавь пару слов в поле'); return; } 
  if(!document.getElementById('agree').checked){ alert('Сначала отметь согласие с офертой ⚠️'); return; } 
  var hasAudio=refs.some(function(r){return r.kind==='audio';}); 
  var hasImgVid=refs.some(function(r){return r.kind==='image'||r.kind==='video';}); 
  if(hasAudio&&!hasImgVid){ alert('Звук-референс работает только вместе с фото или видео-референсом'); return; } 
  
  btn.disabled=true; 
  sendBtn.disabled=true; 
  setStatus('Создаём платёж...'); 
  saveDraft(); 
  
  var model = MODELS[currentModel];
  
  fetch('/api/pay',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      service:'text2video',
      model: model.apiModel,
      seconds:seconds,
      prompt:prompt,
      aspect:aspect,
      quality:quality,
      enhancePrompt: enhancePrompt
    })
  }).then(function(r){return r.json();}).then(function(data){ 
    if(data.error){ throw new Error(data.error); } 
    window.location.href=data.confirmationUrl; 
  }).catch(function(e){ 
    setStatus('Ошибка: '+e.message); 
    btn.disabled=false; 
    sendBtn.disabled=false; 
  }); 
}
btn.addEventListener('click', payClick);
sendBtn.addEventListener('click', payClick);

function chainKey(pid){ return 'yk_gen_chain_'+pid; }
function getChain(pid){ try{ return JSON.parse(localStorage.getItem(chainKey(pid))||'null'); }catch(e){ return null; } }
function setChain(pid,obj){ try{ localStorage.setItem(chainKey(pid), JSON.stringify(obj)); }catch(e){} }
function clearChain(pid){ try{ localStorage.removeItem(chainKey(pid)); }catch(e){} }
function showVideo(url,msg){ document.getElementById('outbox').innerHTML='<div id="result"><video id="video" controls src="'+url+'"></video></div>'; setStatus(msg); baseDone=true; stage='done'; updateSteps(); btn.disabled=false; sendBtn.disabled=false; histPush(url, getPromptText().slice(0,60)||'видео'); }
function startUpscale(pid,baseVideoUrl){ stage='up'; updateSteps(); setStatus('✨ Улучшаем качество до 1080p... ещё около минуты ⏳'); fetch('/api/upscale',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoUrl:baseVideoUrl})}).then(function(r){return r.json();}).then(function(d){ if(d.error){ throw new Error(d.error); } setChain(pid,{taskId:d.taskId,stage:'upscale',baseVideoUrl:baseVideoUrl,upscale:true}); poll(d.taskId,'upscale',baseVideoUrl,pid); }).catch(function(e){ showVideo(baseVideoUrl,'⚠️ Улучшение до 1080p сейчас недоступно ('+e.message+'). Вот готовое видео в 720p — напиши в поддержку, вернём разницу.'); clearChain(pid); }); }
function poll(taskId,stg,baseVideoUrl,pid){ 
  var timer=setInterval(function(){ 
    fetch('/api/status?taskId='+encodeURIComponent(taskId)).then(function(r){return r.json();}).then(function(d){ 
      if(d.status==='succeeded'){ 
        clearInterval(timer); 
        if(stg==='upscale'){ 
          showVideo(d.videoUrl,'Готово! ✅ Full HD 1080p. Скачай видео в течение 7 дней.'); 
          clearChain(pid); 
        } else { 
          baseDone=true; 
          var ch=getChain(pid); 
          if(ch&&ch.upscale&&ch.stage==='base'){ 
            startUpscale(pid,d.videoUrl); 
          } else { 
            showVideo(d.videoUrl,'Готово! ✅ Скачай видео в течение 7 дней.'); 
            clearChain(pid); 
          } 
        } 
      } else if(d.status==='failed'){ 
        clearInterval(timer); 
        if(stg==='upscale'&&baseVideoUrl){ 
          showVideo(baseVideoUrl,'⚠️ Улучшение до 1080p не удалось. Вот готовое видео в 720p — напиши в поддержку, вернём разницу.'); 
          clearChain(pid); 
        } else { 
          setStatus('Ошибка генерации: '+(d.error||'попробуй другой запрос')); 
          stage='setup'; 
          updateSteps(); 
          btn.disabled=false; 
          sendBtn.disabled=false; 
          clearChain(pid); 
        } 
      } else { 
        var modelName = MODELS[currentModel].name;
        setStatus(stg==='upscale'?'✨ Улучшаем качество до 1080p... ещё около минуты ⏳':'⚡ '+modelName+' создаёт твоё видео... ⏳'); 
      } 
    }).catch(function(){}); 
  },5000); 
}

(function(){ 
  var pid=new URLSearchParams(window.location.search).get('paymentId'); 
  if(!pid) return; 
  var ch=getChain(pid); 
  if(ch&&ch.taskId){ 
    paidSeen=true; 
    upscaleExpected=!!ch.upscale; 
    stage=(ch.stage==='upscale')?'up':'gen'; 
    updateSteps(); 
    btn.disabled=true; 
    sendBtn.disabled=true; 
    poll(ch.taskId,ch.stage||'base',ch.baseVideoUrl||null,pid); 
    return; 
  } 
  btn.disabled=true; 
  sendBtn.disabled=true; 
  setStatus('Проверяем оплату...'); 
  fetch('/api/check-payment?paymentId='+encodeURIComponent(pid)).then(function(r){return r.json();}).then(function(data){ 
    if(data.paid&&data.taskId){ 
      paidSeen=true; 
      stage='gen'; 
      updateSteps(); 
      setChain(pid,{taskId:data.taskId,stage:'base',baseVideoUrl:null,upscale:false}); 
      var modelName = MODELS[currentModel].name;
      setStatus('⚡ '+modelName+' создаёт твоё видео... ⏳'); 
      poll(data.taskId,'base',null,pid); 
    } else if(data.paid){ 
      paidSeen=true; 
      updateSteps(); 
      var draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}'); 
      
      // Восстанавливаем модель из черновика
      if(draft.model && MODELS[draft.model]){
        currentModel = draft.model;
      }
      if(draft.enhance!==undefined){
        enhancePrompt = draft.enhance;
      }
      
      var model = MODELS[currentModel];
      var payload={
        service:'text2video',
        paymentId:pid,
        model: model.apiModel,
        prompt:draft.prompt||'',
        aspect:draft.aspect||'16:9',
        seconds:draft.seconds||5,
        quality:draft.quality||'480p',
        enhancePrompt: enhancePrompt
      }; 
      var rl=draft.refs||[], images=[], video=null, audio=null; 
      rl.forEach(function(r){ 
        if(r.kind==='image') images.push(r.data); 
        else if(r.kind==='video') video=r.data; 
        else if(r.kind==='audio') audio=r.data; 
      }); 
      if(images.length){ payload.refs=images; payload.refImage=images[0]; } 
      if(video){ payload.refVideo=video; } 
      if(audio){ payload.refAudio=audio; } 
      upscaleExpected=(payload.quality==='1080p'); 
      setStatus('Оплата прошла! Запускаем генерацию...'); 
      stage='gen'; 
      updateSteps(); 
      fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json();}).then(function(d){ 
        if(d.error){ throw new Error(d.error); } 
        upscaleExpected=!!d.upscale; 
        setChain(pid,{taskId:d.taskId,stage:'base',baseVideoUrl:null,upscale:!!d.upscale}); 
        var modelName = MODELS[currentModel].name;
        setStatus('⚡ '+modelName+' создаёт твоё видео... ⏳'); 
        poll(d.taskId,'base',null,pid); 
      }).catch(function(e){ 
        setStatus('Ошибка: '+e.message); 
        btn.disabled=false; 
        sendBtn.disabled=false; 
      }); 
    } else { 
      setStatus('Оплата не завершена. Твой текст и настройки сохранены — проверь и нажми кнопку ещё раз.'); 
      btn.disabled=false; 
      sendBtn.disabled=false; 
    } 
  }).catch(function(e){ 
    setStatus('Ошибка: '+e.message); 
    btn.disabled=false; 
    sendBtn.disabled=false; 
  }); 
})();

renderRefs();
histRender();
updatePriceDisplay();
updateSteps();
updateEnhanceButton();
})();
