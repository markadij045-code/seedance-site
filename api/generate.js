export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const key = process.env.COMETAPI_KEY;
  if (!key) return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });

  const body = req.body || {};
  const isAdmin = !!process.env.ADMIN_SECRET && body.adminPassword === process.env.ADMIN_SECRET;

  const BASE = { text2video: 199, motion: 199, lipsync: 199, cartoon: 299 };
  const PER_SEC = 30;
  const QUALITY_SURCHARGE = { '480p': 0, '720p': 200, '1080p': 300 };
  const SEEDANCE_SERVICES = { text2video: true, animate: true };

  const SIZE_BY_QUALITY = {
    '480p': { '21:9': '992x432', '16:9': '854x480', '4:3': '752x560', '1:1': '640x640', '3:4': '560x752', '9:16': '480x854' },
    '720p': { '21:9': '1470x630', '16:9': '1280x720', '4:3': '1112x834', '1:1': '960x960', '3:4': '834x1112', '9:16': '720x1280' },
    '1080p': { '21:9': '1470x630', '16:9': '1280x720', '4:3': '1112x834', '1:1': '960x960', '3:4': '834x1112', '9:16': '720x1280' }
  };

  const NEEDS = {
    text2video: {},
    animate: { image: true },
    toon: { image: true },
    cartoon: { image: true },
    avatar: { image: true, audio: true },
    motion: { image: true, video: true },
    lipsync: { video: true, audio: true }
  };

  let service = body.service || 'text2video';
  if (service === 'text30') service = 'text2video';
  const needs = NEEDS[service];
  if (!needs) return res.status(400).json({ error: 'Неизвестная услуга' });

  let quality = (body.quality === '720p' || body.quality === '1080p') ? body.quality : '480p';
  if (!SEEDANCE_SERVICES[service]) quality = '480p';
  const surcharge = SEEDANCE_SERVICES[service] ? QUALITY_SURCHARGE[quality] : 0;

  let seconds = parseInt(body.seconds, 10);
  let expectedPrice;
  if (service === 'avatar') {
    expectedPrice = 499;
    if (!seconds || seconds < 1) seconds = 1;
    if (seconds > 30) seconds = 30;
  } else if (BASE[service]) {
    if (!seconds || seconds < 5) seconds = 5;
    if (seconds > 30) seconds = 30;
    expectedPrice = BASE[service] + (seconds - 5) * PER_SEC + surcharge;
  } else {
    seconds = 5;
    expectedPrice = 199;
  }

  if (!isAdmin) {
    const paymentId = body.paymentId;
    if (!paymentId) return res.status(403).json({ error: 'Генерация доступна только после оплаты' });

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secret = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secret) return res.status(500).json({ error: 'ЮKassa не настроена' });

    const auth = 'Basic ' + Buffer.from(shopId + ':' + secret).toString('base64');
    const pr = await fetch('https://api.yookassa.ru/v3/payments/' + paymentId, { headers: { 'Authorization': auth } });
    const pdata = await pr.json();
    if (!pr.ok || pdata.status !== 'succeeded') {
      return res.status(403).json({ error: 'Оплата не найдена или не завершена' });
    }
    const paid = parseFloat(pdata.amount && pdata.amount.value);
    if (pdata.currency !== 'RUB' || !(paid >= expectedPrice)) {
      return res.status(403).json({ error: 'Сумма оплаты не соответствует выбранной услуге' });
    }
  }

  const prompt = String(body.prompt || '').trim();
  const aspect = body.aspect || '16:9';
  const size = (SIZE_BY_QUALITY[quality] && SIZE_BY_QUALITY[quality][aspect]) || SIZE_BY_QUALITY[quality]['16:9'];
  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  if (service === 'text2video' && !prompt) {
    return res.status(400).json({ error: 'Нужен промпт' });
  }

  let img = null, vid = null, aud = null;
  if (needs.image) {
    if (!body.image) return res.status(400).json({ error: 'Нужно загрузить картинку' });
    img = await resolveMedia(body.image, 'image');
    if (img.error) return res.status(400).json({ error: img.error });
  }
  if (needs.video) {
    if (!body.video) return res.status(400).json({ error: 'Нужно загрузить видео' });
    vid = await resolveMedia(body.video, 'video');
    if (vid.error) return res.status(400).json({ error: vid.error });
  }
  if (needs.audio) {
    if (!body.audio) return res.status(400).json({ error: 'Нужно загрузить аудио' });
    aud = await resolveMedia(body.audio, 'audio');
    if (aud.error) return res.status(400).json({ error: aud.error });
  }

  var refs = [];
  var refsIn = Array.isArray(body.refs) ? body.refs.slice(0, 10) : (body.refImage ? [body.refImage] : []);
  for (var ri = 0; ri < refsIn.length; ri++) {
    var rr = await resolveMedia(refsIn[ri], 'image');
    if (rr.error) return res.status(400).json({ error: 'Референс ' + (ri + 1) + ': ' + rr.error });
    refs.push(rr);
  }

  var refVid = null;
  if (body.refVideo && SEEDANCE_SERVICES[service]) {
    refVid = await resolveMedia(body.refVideo, 'video');
    if (refVid.error) return res.status(400).json({ error: 'Видео-референс: ' + refVid.error });
  }

  var refAud = null;
  if (body.refAudio && SEEDANCE_SERVICES[service]) {
    if (refs.length === 0 && !refVid && !img) {
      return res.status(400).json({ error: 'Звук-референс работает только вместе с картинкой или видео' });
    }
    refAud = await resolveMedia(body.refAudio, 'audio');
    if (refAud.error) return res.status(400).json({ error: 'Звук-референс: ' + refAud.error });
  }

  function withRoles(p, nImages, hasVideo, hasAudio) {
    if (p.indexOf('@Image') !== -1 || p.indexOf('@Video') !== -1 || p.indexOf('@Audio') !== -1) return p;
    var parts = [];
    if (nImages > 0) parts.push(nImages === 1 ? '@Image1 as the visual reference' : '@Image1-@Image' + nImages + ' as visual references');
    if (hasVideo) parts.push('@Video1 as the camera and motion guide');
    if (hasAudio) parts.push('@Audio1 as the sound and rhythm guide');
    if (!parts.length) return p;
    return p + ' Use ' + parts.join(', ') + '.';
  }

  try {
    if (service === 'toon' || service === 'cartoon') {
      const userScene = String(body.prompt || '').trim();
      const stylePrompt = 'Transform this photo into a 3D animated movie character in Pixar style. Keep the person recognizable but clearly cartoonish. Bright friendly colors, clean simple background.' + (userScene ? ' Scene and action: ' + userScene : '');
      const geminiAspect = (['1:1','16:9','9:16','4:3','3:4','21:9'].indexOf(aspect) !== -1) ? aspect : '1:1';
      const r = await fetch('https://api.cometapi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent', {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: stylePrompt }, { inlineData: { mimeType: img.mime, data: img.buffer.toString('base64') } }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: geminiAspect } }
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(502).json({ error: 'Не удалось создать арт, попробуйте ещё раз' });
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      let finalImage = null;
      if (parts) {
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].thought) continue;
          if (parts[i].inlineData && parts[i].inlineData.data) { finalImage = parts[i].inlineData; break; }
        }
      }
      if (!finalImage) return res.status(502).json({ error: 'Не удалось создать арт, попробуйте ещё раз' });
      return res.json({ image: finalImage.data, mime: finalImage.mimeType || 'image/png' });
    }

    const form = new FormData();
    form.append('seconds', String(seconds));
    form.append('size', size);

    if (service === 'avatar') {
      form.append('model', 'kling-avatar-image2video');
      form.append('image', new Blob([img.buffer], { type: img.mime }), 'photo.jpg');
      form.append('audio', new Blob([aud.buffer], { type: aud.mime }), 'voice.mp3');
      form.append('mode', 'std');
    } else if (service === 'animate') {
      var images2 = [img].concat(refs);
      form.append('model', model);
      form.append('prompt', withRoles(prompt || 'The scene comes alive: natural smooth motion, gentle camera movement', images2.length, !!refVid, !!refAud));
      for (var ai = 0; ai < images2.length; ai++) {
        form.append('input_reference', new Blob([images2[ai].buffer], { type: images2[ai].mime }), 'ref' + ai + '.jpg');
      }
      if (refVid) form.append('reference_videos', new Blob([refVid.buffer], { type: refVid.mime }), 'motionref.mp4');
      if (refAud) form.append('reference_audios', new Blob([refAud.buffer], { type: refAud.mime }), 'soundref.mp3');
    } else if (service === 'motion') {
      form.append('model', 'kling-video');
      form.append('prompt', prompt || 'The character from the image performs the exact same movements and speech as in the reference video');
      form.append('input_reference', new Blob([img.buffer], { type: img.mime }), 'photo.jpg');
      form.append('video_reference', new Blob([vid.buffer], { type: vid.mime }), 'motion.mp4');
    } else if (service === 'lipsync') {
      form.append('model', 'kling-advanced-lip-sync');
      form.append('video', new Blob([vid.buffer], { type: vid.mime }), 'video.mp4');
      form.append('audio', new Blob([aud.buffer], { type: aud.mime }), 'voice.mp3');
    } else {
      form.append('model', model);
      form.append('prompt', withRoles(prompt, refs.length, !!refVid, !!refAud));
      for (var ti = 0; ti < refs.length; ti++) {
        form.append('input_reference', new Blob([refs[ti].buffer], { type: refs[ti].mime }), 'ref' + ti + '.jpg');
      }
      if (refVid) form.append('reference_videos', new Blob([refVid.buffer], { type: refVid.mime }), 'motionref.mp4');
      if (refAud) form.append('reference_audios', new Blob([refAud.buffer], { type: refAud.mime }), 'soundref.mp3');
    }

    const r = await fetch('https://api.cometapi.com/v1/videos', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key },
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Не удалось создать видео, попробуйте ещё раз' });
    const taskId = data.id || data.task_id;
    if (!taskId) return res.status(502).json({ error: 'Не удалось создать видео, попробуйте ещё раз' });
    return res.json({ taskId: taskId, upscale: quality === '1080p' });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось создать видео, попробуйте ещё раз' });
  }
}

async function resolveMedia(value, kind) {
  const limits = { image: 20 * 1024 * 1024, video: 50 * 1024 * 1024, audio: 15 * 1024 * 1024 };
  try {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const comma = value.indexOf(',');
      if (comma === -1) return { error: 'Не удалось прочитать файл' };
      const header = value.slice(0, comma);
      let mime;
      if (kind === 'image') {
        if (header.indexOf('image/png') !== -1) mime = 'image/png';
        else if (header.indexOf('image/jpeg') !== -1 || header.indexOf('image/jpg') !== -1) mime = 'image/jpeg';
        else if (header.indexOf('image/webp') !== -1) mime = 'image/webp';
        else return { error: 'Поддерживаются только JPG, PNG и WebP' };
      } else if (kind === 'video') {
        if (header.indexOf('video/webm') !== -1) mime = 'video/webm';
        else if (header.indexOf('video/mp4') !== -1) mime = 'video/mp4';
        else return { error: 'Видео должно быть в формате MP4' };
      } else {
        if (header.indexOf('audio/') === -1) return { error: 'Поддерживаются аудио MP3/WAV' };
        mime = header.slice(5).split(';')[0];
      }
      const base64 = value.slice(comma + 1);
      if (base64.length < 100) return { error: 'Не удалось прочитать файл' };
      const buf = Buffer.from(base64, 'base64');
      if (buf.length > limits[kind]) return { error: tooBigMsg(kind) };
      return { mime: mime, buffer: buf };
    }
    if (typeof value === 'string' && value.startsWith('http')) {
      const r = await fetch(value);
      if (!r.ok) return { error: 'Не удалось загрузить файл' };
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > limits[kind]) return { error: tooBigMsg(kind) };
      const ct = r.headers.get('content-type') || (kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'audio/mpeg');
      return { mime: ct.split(';')[0], buffer: buf };
    }
    return { error: 'Не удалось прочитать файл' };
  } catch (e) {
    return { error: 'Не удалось прочитать файл' };
  }
}

function tooBigMsg(kind) {
  if (kind === 'video') return 'Видео слишком большое (максимум 50 МБ)';
  if (kind === 'audio') return 'Аудио слишком большое (максимум 15 МБ)';
  return 'Файл слишком большой (максимум 20 МБ)';
}
