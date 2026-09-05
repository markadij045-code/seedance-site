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

  // === Цены моушен контроля по секундам ===
  const MOTION_PRICES = { 5: 199, 10: 349, 15: 499, 20: 649, 25: 799, 30: 949 };

  // === ТАБЛИЦА УСЛУГ ===
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

  // === Секунды (для моушен контроля —snap к ближайшей из прайса) ===
  let seconds = parseInt(body.seconds, 10);
  if (cfg.prices) {
    if (!seconds) seconds = 10;
    if (!cfg.prices[seconds]) {
      const keys = Object.keys(cfg.prices).map(Number).sort(function(a, b) { return a - b; });
      seconds = keys.reduce(function(prev, cur) {
        return Math.abs(cur - seconds) < Math.abs(prev - seconds) ? cur : prev;
      });
    }
  } else {
    if (!seconds) seconds = (service === 'text30') ? 30 : 5;
  }
  if (seconds > cfg.maxSeconds) seconds = cfg.maxSeconds;

  const expectedPrice = cfg.prices ? cfg.prices[seconds] : cfg.price;

  // === ЗАЩИТА: без пароля владельца нужен ОПЛАЧЕННЫЙ платёж на НУЖНУЮ сумму ===
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

  // === Данные для генерации ===
  const prompt = String(body.prompt || '').trim();
  const image = String(body.image || '');
  const video = String(body.video || '');
  const audio = String(body.audio || '');
  const orientation = body.orientation || '9:16';
  const size = String(body.size || '1280x720');
  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  // === Проверки входных данных ===
  if (!cfg.needsImage && !cfg.needsVideo && !prompt) {
    return res.status(400).json({ error: 'Нужен промпт' });
  }

  let img = null;
  if (cfg.needsImage) {
    if (!image) return res.status(400).json({ error: 'Нужно загрузить картинку' });
    img = parseMedia(image, 'image');
    if (img.error) return res.status(400).json({ error: img.error });
  }

  let vid = null;
  if (cfg.needsVideo) {
    if (!video) return res.status(400).json({ error: 'Нужно загрузить видео' });
    vid = parseMedia(video, 'video');
    if (vid.error) return res.status(400).json({ error: vid.error });
  }

  let aud = null;
  if (cfg.needsAudio) {
    if (!audio) return res.status(400).json({ error: 'Нужно загрузить аудио' });
    aud = parseMedia(audio, 'audio');
    if (aud.error) return res.status(400).json({ error: aud.error });
  }

  try {
    const sizes = { '9:16': '720x1280', '16:9': '1280x720', '1:1': '720x720' };

    // === ТУН (арт в стиле Pixar) — отдельный эндпоинт Gemini ===
    if (service === 'toon') {
      const stylePrompt = 'Transform this photo into a 3D animated movie character in Pixar style. Keep the person recognizable but clearly cartoonish. Bright friendly colors, clean simple background.';
      const r = await fetch('https://api.cometapi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent', {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: stylePrompt }, { inlineData: { mimeType: img.mime, data: img.base64 } }] }],
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

    // === Все видео-услуги: единый эндпоинт ===
    const form = new FormData();
    form.append('seconds', String(seconds));

    if (service === 'avatar') {
      form.append('model', model);
      form.append('prompt', 'The person speaks naturally, slight head movements and expressions');
      form.append('size', sizes[orientation] || '720x1280');
      form.append('input_reference', new Blob([Buffer.from(img.base64, 'base64')], { type: img.mime }), 'avatar.jpg');

    } else if (service === 'animate') {
      form.append('model', model);
      form.append('prompt', prompt || 'The scene comes alive: natural smooth motion, gentle camera movement');
      form.append('size', sizes[orientation] || '1280x720');
      form.append('input_reference', new Blob([Buffer.from(img.base64, 'base64')], { type: img.mime }), 'photo.jpg');

    } else if (service === 'motion') {
      // ФОТО + ВИДЕО с движением → персонаж повторяет всё, с липсинком
      form.append('model', model);
      form.append('prompt', prompt || 'The character from the image performs the exact same movements and speech as in the reference video');
      form.append('size', sizes[orientation] || '720x1280');
      form.append('input_reference', new Blob([Buffer.from(img.base64, 'base64')], { type: img.mime }), 'photo.jpg');
      form.append('video_reference', new Blob([Buffer.from(vid.base64, 'base64')], { type: vid.mime }), 'motion.mp4');

    } else if (service === 'lipsync') {
      // ВИДЕО + АУДИО → губы синхронно с речью
      form.append('model', 'kling_advanced_lip_syn');
      form.append('video', new Blob([Buffer.from(vid.base64, 'base64')], { type: vid.mime }), 'video.mp4');
      form.append('audio', new Blob([Buffer.from(aud.base64, 'base64')], { type: aud.mime }), 'voice.mp3');

    } else {
      // text2video / text30
      form.append('model', model);
      form.append('prompt', prompt);
      form.append('size', size);
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

// === Проверка файлов: формат и размер ===
function parseMedia(data, kind) {
  let mime = kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'audio/mpeg';
  let base64 = data;
  if (data.startsWith('data:')) {
    const comma = data.indexOf(',');
    if (comma === -1) return { error: 'Не удалось прочитать файл' };
    const header = data.slice(0, comma);
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
    base64 = data.slice(comma + 1);
  }
  if (base64.length < 100) return { error: 'Не удалось прочитать файл' };
  const bytes = Math.ceil(base64.length * 0.75);
  if (kind === 'image' && bytes > 10 * 1024 * 1024) return { error: 'Файл слишком большой (максимум 10 МБ)' };
  if (kind === 'video' && bytes > 3 * 1024 * 1024) return { error: 'Видео слишком большое (максимум 3 МБ). Выбери ролик короче или сожми.' };
  if (kind === 'audio' && bytes > 2 * 1024 * 1024) return { error: 'Аудио слишком большое (максимум 2 МБ)' };
  return { mime: mime, base64: base64 };
}
