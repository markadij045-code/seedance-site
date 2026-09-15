(function(){
  if(location.pathname.indexOf('avatar')===-1) return;
  if(typeof window.renderAudioTile!=='function') return;
  window.onAudioFile=function(e){
    var f=e.target.files[0]; if(!f) return;
    if(f.type.indexOf('audio/')!==0){ alert('Нужно аудио в формате MP3 или WAV'); return; }
    if(f.size>3*1024*1024){ alert('Выбери аудио до 3 МБ (например, голосовую запись).'); return; }
    probeAudio(f,30,function(dur){
      if(window.localAudioBlobUrl){ URL.revokeObjectURL(window.localAudioBlobUrl); }
      window.localAudioBlobUrl=URL.createObjectURL(f);
      window.audioNameStr=f.name;
      renderAudioTile();
      setStatus('Загружаем аудио...');
      var reader=new FileReader();
      reader.onload=function(){
        var base64=String(reader.result).split(',')[1];
        fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:safeFileName('avatar-audio',f,'.mp3'),base64:base64,contentType:f.type||'audio/mpeg')})
          .then(function(r){return r.json().then(function(dd){return {ok:r.ok,d:dd};});})
          .then(function(x){
            if(!x.ok||!x.d.url){ throw new Error(x.d.error||'Ошибка загрузки'); }
            window.audioData=x.d.url;
            window.audioSec=Math.min(30,Math.max(1,Math.ceil(dur)));
            if(window.localAudioBlobUrl){ URL.revokeObjectURL(window.localAudioBlobUrl); window.localAudioBlobUrl=null; }
            renderAudioTile();
            setStatus('');
            saveDraft(); updateSteps(); updateBar();
          })
          .catch(function(err){ setStatus(''); alert('Не удалось загрузить аудио: '+err.message); });
      };
      reader.readAsDataURL(f);
    });
  };
  renderAudioTile();
})();
