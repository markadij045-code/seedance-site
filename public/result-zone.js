/* ЗОНА РЕЗУЛЬТАТА (RZ) — универсальный компонент студии «Ёшкин кот»
   Состояния: empty | work | done | error
   Подключение: <script src="/result-zone.js"></script>
   var rz = RZ.mount('rzZone', cfg);
   RZ.work(rz); RZ.done(rz, html); RZ.error(rz, 'текст'); RZ.empty(rz);
   cfg: {emptyIcon,emptyTitle,emptySub, lines:[строки по кругу], lineMs,
         videoUrl:'' (видео встанет позже), screenNote, doneFlash, doneTitle} */
(function(){
  var CSS = ''
  +'.rz{margin:22px 0 0}'
  +'.rz-card{border:1px solid var(--border,#23281f);border-radius:18px;background:radial-gradient(420px 200px at 50% 0,rgba(163,230,53,.06),transparent 70%),rgba(0,0,0,.32);padding:18px 18px 16px;text-align:center}'
  +'.rz-empty{border-style:dashed}'
  +'.rz-ico{font-size:2rem;line-height:1;margin-bottom:10px;opacity:.9}'
  +'.rz-t{color:var(--text,#f4f5f6);font-weight:600;font-size:.95rem}'
  +'.rz-s{color:var(--muted,#9ca3af);font-size:.8rem;margin-top:5px;line-height:1.55}'
  +'.rz-screen{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid var(--border,#23281f);background:#000;display:grid;place-items:center}'
  +'.rz-screen video{width:100%;height:100%;object-fit:cover;display:block}'
  +'.rz-ph{display:grid;place-items:center;gap:8px;color:var(--muted,#9ca3af);font-size:.8rem;text-align:center;padding:12px}'
  +'.rz-ph .cl{font-size:2.2rem;line-height:1}'
  +'.rz-time{position:absolute;top:8px;right:10px;background:rgba(0,0,0,.55);color:var(--muted,#9ca3af);padding:2px 9px;border-radius:999px;font-size:.75rem;font-variant-numeric:tabular-nums}'
  +'.rz-line{margin:12px 2px 2px;text-align:center;color:var(--text,#f4f5f6);font-size:.92rem;font-weight:600;min-height:22px;line-height:1.4}'
  +'.rz-flash{display:grid;place-items:center;gap:10px;padding:34px 18px;text-align:center}'
  +'.rz-flash .cl{font-size:3rem;line-height:1}'
  +'.rz-flash .ft{color:var(--lime,#A3E635);font-family:\'Space Grotesk\',sans-serif;font-size:1.3rem;font-weight:700}'
  +'.rz-done{text-align:left}'
  +'.rz-dh{display:flex;gap:8px;align-items:center;color:var(--lime,#A3E635);font-weight:700;font-size:.95rem;margin-bottom:12px}'
  +'.rz-err{border-color:rgba(248,113,113,.45);background:radial-gradient(420px 200px at 50% 0,rgba(248,113,113,.08),transparent 70%),rgba(0,0,0,.32)}'
  +'.rz-ei{font-size:1.7rem;line-height:1;margin-bottom:8px}'
  +'.rz-em{color:#fca5a5;font-size:.85rem;margin-top:6px;line-height:1.55}'
  +'.rz-eb{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:14px;flex-wrap:wrap}'
  +'.rz-eb a{color:var(--muted,#9ca3af);font-size:.8rem}'
  +'.rz-eb a:hover{color:var(--lime,#A3E635)}'
  +'@media(max-width:600px){.rz-card{padding:14px}}';

  if(!document.getElementById('rzStyle')){
    var st=document.createElement('style'); st.id='rzStyle'; st.textContent=CSS; document.head.appendChild(st);
  }

  function get(z){ return (typeof z==='string')?document.getElementById(z):z; }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function stopTimers(z){ if(z._timer){ clearInterval(z._timer); z._timer=null; } if(z._ltimer){ clearInterval(z._ltimer); z._ltimer=null; } if(z._ftimeout){ clearTimeout(z._ftimeout); z._ftimeout=null; } }

  function mount(target,cfg){
    var z=get(target); if(!z) return null;
    z.className='rz'; z._cfg=cfg||{}; z._t0=null; z._timer=null; z._ltimer=null; z._ftimeout=null; z._state='';
    empty(z);
    return z;
  }

  function empty(z){
    z=get(z); stopTimers(z); z._state='empty';
    var c=z._cfg||{};
    z.innerHTML='<div class="rz-card rz-empty">'
      +'<div class="rz-ico">'+(c.emptyIcon||'')+'</div>'
      +'<div class="rz-t">'+(c.emptyTitle||'Здесь появится результат')+'</div>'
      +'<div class="rz-s">'+(c.emptySub||'')+'</div>'
      +'</div>';
  }

  function work(z){
    z=get(z); var c=z._cfg||{};
    if(z._state!=='work'){
      stopTimers(z); z._t0=Date.now();
      z._timer=setInterval(function(){
        var t=z.querySelector('.rz-time'); if(!t) return;
        var s=Math.floor((Date.now()-z._t0)/1000);
        t.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
      },1000);
      var lines=c.lines||[]; var li=0;
      var putLine=function(){ var el=z.querySelector('.rz-line'); if(el&&lines.length) el.textContent=lines[li]; };
      if(lines.length){
        putLine();
        z._ltimer=setInterval(function(){ if(li<lines.length-1){ li++; putLine(); } }, c.lineMs||4000);
      }
    }
    var screen;
    if(c.videoUrl){
      screen='<div class="rz-screen"><video src="'+c.videoUrl+'" autoplay muted loop playsinline></video><span class="rz-time">0:00</span></div>';
    }else{
      screen='<div class="rz-screen"><div class="rz-ph"><span class="cl">🎬</span><span>'+(c.screenNote||'Съёмочная площадка монтируется')+'</span></div><span class="rz-time">0:00</span></div>';
    }
    z.innerHTML='<div class="rz-card rz-work">'+screen+'<div class="rz-line"></div></div>';
    z._state='work';
    var lines2=c.lines||[];
    if(lines2.length){ var el=z.querySelector('.rz-line'); if(el) el.textContent=lines2[0]; }
  }

  function done(z,html){
    z=get(z); stopTimers(z); z._state='done';
    var c=z._cfg||{};
    function showGrid(){
      if(z._state!=='done') return;
      z.innerHTML='<div class="rz-card rz-done">'
        +'<div class="rz-dh">'+(c.doneIcon||'✅')+' <span>'+(c.doneTitle||'Готово!')+'</span></div>'
        +'<div class="rz-slot">'+(html||'')+'</div>'
        +'</div>';
    }
    if(c.doneFlash){
      z.innerHTML='<div class="rz-card rz-flash"><span class="cl">🎬</span><span class="ft">'+c.doneFlash+'</span></div>';
      z._ftimeout=setTimeout(showGrid, 1200);
    }else{ showGrid(); }
  }

  function error(z,msg){
    z=get(z); stopTimers(z); z._state='error';
    z.innerHTML='<div class="rz-card rz-err">'
      +'<div class="rz-ei">⚠️</div>'
      +'<div class="rz-t">Что-то пошло не так</div>'
      +'<div class="rz-em">'+esc(msg||'Неизвестная ошибка')+'</div>'
      +'<div class="rz-eb"><a href="/help.html">Написать в поддержку</a></div>'
      +'</div>';
  }

  window.RZ={mount:mount,empty:empty,work:work,done:done,error:error};
})();
