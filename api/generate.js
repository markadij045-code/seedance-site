export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });
  }

  const body = req.body || {};
  const isAdmin = !!process.env.ADMIN_SECRET && body.adminPassword === process.env.ADMIN_SECRET;

  const MOTION_PRICES = { 5: 199, 10: 349, 15: 499, 20: 649, 25: 799, 30: 949 };

  const SERVICES = {
    text2video: { price: 199, maxSeconds: 10 },
    text30:     { price: 999, maxSeconds: 30 },
    animate:    { price: 199, maxSeconds: 10, needsImage: true },
    toon:       { price: 299, maxSeconds: 10, needsImage: true },
    cartoon:    { price: 299, maxSeconds: 10, needsImage: true },
    avatar:     { price: 499, maxSeconds: 10, needsImage: true },
    motion:     { maxSeconds: 30, needsImage: true, needsVideo: true, prices: MOTION_PRICES },
    lipsync:    { price: 199, maxSeconds: 10, needsVideo: true, needsAudio: true }
  };

  const service = body.service || 'text2video';
  const cfg = SERVICES[service];
  if (!cfg) {
    return res.status(400).json({ error: 'Неизвестная услуга' });
  }

  let seconds = parseInt(body.seconds, 10);
  if (cfg.prices) {
    if (!seconds) seconds = 10;
    if (!cfg.prices[seconds]) {
      const keys = Object.keys(cfg.prices).map(Number).sort(function(a, b) { return a - b; });
      seconds = keys.reduce(function(p, c) { return Math.abs(c - seconds) < Math.abs(p - seconds) ? c : p; });
    }
  } else {
    if (!seconds) seconds = (service === 'text30') ? 30 : 5;
  }
  if (seconds > cfg.maxSeconds) seconds = cfg.maxSeconds;

  const expectedPrice = cfg.prices ? cfg.prices[seconds] : cfg.price;

  // === ЗАЩИТА: нужен оплаченный платёж на нужную сумму ===
  if (!isAdmin) {
    const paymentId = body.paymentId;
    if (!paymentId) {
      return res.status(403).json({ error: 'Генерация доступна только после оплаты' });
    }

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secret = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secret) {
      return res.status(500).json({ error: 'ЮKassa не настроена' });
    }

    const auth = 'Basic ' + Buffer.from(shopId + ':' + secret).toString('base64');
    const pr = await fetch('https://api.yookassa.ru/v3/payments/' + paymentId, {
      headers: { 'Authorization': auth }
    });
    const pdata = await pr.json();

    if (!pr.ok || pdata.status !== 'succeeded') {
      return res.status(403).json({ error: 'Оплата не найдена или не завершена' });
    }

    const paid = parseFloat(pdata.amount && pdata.amount.value);
    if (pdata.currency !== 'RUB' || !(paid >= expectedPrice)) {
      console.error('Payment mismatch:', paymentId, pdata.amount, 'service:', service, 'seconds:', seconds);
      return res.status(403).json({ error: 'Сумма оплаты не соответствует выбранной услуге' });
    }
  }

  const prompt = String(body.prompt || '').trim();
  const orientation = body.orientation || '9:16';
  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  if (!cfg.needsImage && !cfg.needsVideo && !prompt) {
    return res.status(400).json({ error: 'Нужен промпт' });
  }

  let img = null, vid = null, aud = null;
  if (cfg.needsImage) {
    if (!body.image) return res.status(400).json({ error: 'Нужно загрузить картинку' });
    img = await resolveMedia(body.image, 'image');
    if (img.error) return res.status(400).json({ error: img.error });
  }
  if (cfg.needsVideo) {
    if (!body.video) return res.status(400).json({ error: 'Нужно загрузить видео' });
    vid = await resolveMedia(body.video, 'video');
    if (vid.error) return res.status(400).json({ error: vid.error });
  }
  if (cfg.needsAudio) {
    if (!body.audio) return res.status(400).json({ error: 'Нужно загрузить аудио' });
    aud = await resolveMedia(body.audio, 'audio');
    if (aud.error) return res.status(400).json({ error: aud.error });
  }

  try {
    // === МУЛЬТФИЛЬМ (арт в стиле Pixar) — Gemini ===
    if (service === 'toon' || service === 'cartoon') {
      const stylePrompt = 'Transform this photo into a 3D animated movie character in Pixar style. Keep the person recognizable but clearly cartoonish. Bright friendly colors, clean simple background.';
      const r = await fetch('https://api.cometapi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent', {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: stylePrompt }, { inlineData: { mimeType: img.mime, data: img.buffer.toString('base64') } }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } }
        })
      });
      const data = await r.json();
      if (!r.ok) {
        console.error('Toon API error:', r.status, JSON.stringify(data));
        return res.status(502).json({ error: 'Не удалось создать арт, попробуйте ещё раз' });
      }
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      let finalImage = null;
      if (parts) {
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].thought) continue;
          if (parts[i].inlineData && parts[i].inlineData.data) { finalImage = parts[i].inlineData; break; }
        }
      }
      if (!finalImage) {
        return res.status(502).json({ error: 'Не удалось создать арт, попробуйте ещё раз' });
      }
      return res.json({ image: finalImage.data, mime: finalImage.mimeType || 'image/png' });
    }

    // === Все видео-услуги ===
    const form = new FormData();
    form.append('seconds', String(seconds));
    form.append('size', orientation);

    if (service === 'avatar') {
      form.append('model', model);
      form.append('prompt', 'The person speaks naturally, slight head movements and expressions');
      form.append('input_reference', new Blob([img.buffer], { type: img.mime }), 'avatar.jpg');

    } else if (service === 'animate') {
      form.append('model', model);
      form.append('prompt', prompt || 'The scene comes alive: natural smooth motion, gentle camera movement');
      form.append('input_reference', new Blob([img.buffer], { type: img.mime }), 'photo.jpg');

    } else if (service === 'motion') {
      form.append('model', model);
      form.append('prompt', prompt || 'The character from the image performs the exact same movements and speech as in the reference video');
      form.append('input_reference', new Blob([img.buffer], { type: img.mime }), 'photo.jpg');
      form.append('video_reference', new Blob([vid.buffer], { type: vid.mime }), 'motion.mp4');

    } else if (service === 'lipsync') {
      form.append('model', 'kling_advanced_lip_syn');
      form.append('video', new Blob([vid.buffer], { type: vid.mime }), 'video.mp4');
      form.append('audio', new Blob([aud.buffer], { type: aud.mime }), 'voice.mp3');

    } else {
      form.append('model', model);
      form.append('prompt', prompt);
    }

    const r = await fetch('https://api.cometapi.com/v1/videos', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key },
      body: form
    });
    const data = await r.json();

    if (!r.ok) {
      console.error('CometAPI error:', r.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Не удалось создать видео, попробуйте ещё раз' });
    }
    const taskId = data.id || data.task_id;
    if (!taskId) {
      console.error('CometAPI no taskId:', JSON.stringify(data));
      return res.status(502).json({ error: 'Не удалось создать видео, попробуйте ещё раз' });
    }
    return res.json({ taskId: taskId });

  } catch (e) {
    console.error('Generate error:', e);
    return res.status(500).json({ error: 'Не удалось создать видео, попробуйте ещё раз' });
  }
}

// === Принимает base64 (старые страницы) ИЛИ ссылку из Blob (новые) ===
async function resolveMedia(value, kind) {
  const limits = { image: 10 * 1024 * 1024, video: 20 * 1024 * 1024, audio: 5 * 1024 * 1024 };
  try {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const comma = value.indexOf(',');
      if (comma === -1) return { error: 'Не удалось прочитать файл' };
      const header = value.slice(0, comma);
      let mime;
      if (kind === 'image') {
        if (header.indexOf('image/png') !== -1) mime = 'image/png';
        else if (header.indexOf('image/jpeg') !== -1 || header.indexOf('image/jpg') !== -1) mime = 'image/jpeg';
        else return { error: 'Поддерживаются только JPG и PNG' };
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
  if (kind === 'video') return 'Видео слишком большое (максимум 20 МБ)';
  if (kind === 'audio') return 'Аудио слишком большое (максимум 5 МБ)';
  return 'Файл слишком большой (максимум 10 МБ)';
}
