/* ЗОНА РЕЗУЛЬТАТА (RZ) — универсальный компонент студии «Ёшкин кот»
   Состояния: hidden (скрыта) | work (идёт работа) | done (готово) | error (ошибка)
   До старта генерации зона НЕВИДИМА — появляется по факту.
   work: переливающийся «холст» (или зацикленное видео, если cfg.workVideoUrl задан)
   done: рамка-холст с результатом (или клип cfg.doneVideoUrl, затем рамка)
   error: красная карточка + поддержка, без кнопки повтора
   Субтитров и процентов нет по умолчанию.
   Подключение: <script src="/result-zone.js"></script>
   var rz = RZ.mount('rzZone', cfg); RZ.work(rz); RZ.done(rz, html); RZ.error(rz, msg); RZ.hidden(rz); */
(function(){
  var CSS = ''
  +'.rz{margin:0}'
  +'.rz-card{border:1px solid var(--border,#23281f);border-radius:18px;background:rgba(0,0,0,.32);overflow:hidden}'
  +'.rz-anim{position:relative;aspect-ratio:16/9;background:#07090a;overflow:hidden}'
  +'.rz-anim::before{content:"";position:absolute;inset:-40%;background:radial-gradient(closest-side,rgba(163,230,53,.30),rgba(163,230,53,.07) 45%,transparent 72%);animation:rzdrift 7s ease-in-out infinite alternate,rzbreath 3.2s ease-in-out infinite}'
  +'.rz-anim::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 50%,transparent 55%,rgba(0,0,0,.55));pointer-events:none}'
  +'@keyframes rzdrift{from{transform:translate(-12%,-8%) scale(1)}to{transform:translate(14%,10%) scale(1.18)}}'
  +'@keyframes rzbreath{0%,100%{opacity:.5}50%{opacity:.95}}'
  +'.rz-anim video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
  +'.rz-canvas{padding:14px;background:linear-gradient(180deg,#2a1f14,#1a120b);border-top:1px solid rgba(255,255,255,.05)}'
  +'.rz-canvas .slot img{width:100%;border-radius:6px;display:block;background:#000}'
  +'.rz-canvas .slot{box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05)}'
  +'.rz-donehead{display:flex;gap:8px;align-items:center;color:var(--lime,#A3E635);font-weight:700;font-size:.92rem;padding:12px 16px 0}'
  +'.rz-err{border-color:rgba(248,113,113,.45);background:radial-gradient(420px 200px at 50% 0,rgba(248,113,113,.08),transparent 70%),rgba(0,0,0,.32);padding:22px 18px;text-align:center}'
  +'.rz-ei{font-size:1.7rem;line-height:1;margin-bottom:8px}'
  +'.rz-et{color:var(--text,#f4f5f6);font-weight:600;font-size:.95rem}'
  +'.rz-em{color:#fca5a5;font-size:.85rem;margin-top:6px;line-height:1.55}'
  +'.rz-eb{margin-top:14px}'
  +'.rz-eb a{color:var(--muted,#9ca3af);font-size:.8rem}'
  +'.rz-eb a:hover{color:var(--lime,#A3E635)}'
  +'@media(max-width:600px){.rz-canvas{padding:10px}}';

  if(!document.getElementById('rzStyle')){
    var st=document.createElement('style'); st.id='rzStyle'; st.textContent=CSS; document.head.appendChild(st);
  }

  function get(z){ return (typeof z==='string')?document.getElementById(z):z; }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function stopTimers(z){ if(z._vtimeout){ clearTimeout(z._vtimeout); z._vtimeout=null; } }

  function mount(target,cfg){
    var z=get(target); if(!z) return null;
    z.className='rz'; z._cfg=cfg||{}; z._vtimeout=null; z._state='hidden';
    z.style.display='none'; z.innerHTML='';
    return z;
  }

  function hidden(z){
    z=get(z); stopTimers(z); z._state='hidden';
    z.style.display='none'; z.innerHTML='';
  }

  function work(z){
    z=get(z); stopTimers(z); var c=z._cfg||{};
    z.style.display=''; z._state='work';
    if(c.workVideoUrl){
      z.innerHTML='<div class="rz-card"><div class="rz-anim"><video src="'+c.workVideoUrl+'" autoplay muted loop playsinline></video></div></div>';
    }else{
      z.innerHTML='<div class="rz-card"><div class="rz-anim"></div></div>';
    }
  }

  function paintCanvas(z,html){
    var c=z._cfg||{};
    z.innerHTML='<div class="rz-card">'
      +(c.doneTitle?'<div class="rz-donehead">✅ <span>'+esc(c.doneTitle)+'</span></div>':'')
      +'<div class="rz-canvas"><div class="slot">'+(html||'')+'</div></div>'
      +'</div>';
  }

  function done(z,html){
    z=get(z); stopTimers(z); var c=z._cfg||{};
    z.style.display=''; z._state='done';
    if(c.doneVideoUrl){
      z.innerHTML='<div class="rz-card"><div class="rz-anim"><video id="rzDoneVid" src="'+c.doneVideoUrl+'" autoplay muted playsinline></video></div></div>';
      var v=z.querySelector('#rzDoneVid');
      var reveal=function(){ paintCanvas(z,html); };
      if(v){ v.addEventListener('ended',reveal); z._vtimeout=setTimeout(reveal,5000); }
      else reveal();
    }else{
      paintCanvas(z,html);
    }
  }

  function error(z,msg){
    z=get(z); stopTimers(z); z._state='error';
    z.style.display='';
    z.innerHTML='<div class="rz-card rz-err">'
      +'<div class="rz-ei">⚠️</div>'
      +'<div class="rz-et">Что-то пошло не так</div>'
      +'<div class="rz-em">'+esc(msg||'Неизвестная ошибка')+'</div>'
      +'<div class="rz-eb"><a href="/help.html">Написать в поддержку</a></div>'
      +'</div>';
  }

  window.RZ={mount:mount,hidden:hidden,work:work,done:done,error:error};
})();
