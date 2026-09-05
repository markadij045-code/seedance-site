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

  // === ТАБЛИЦА ЦЕН И ЛИМИТОВ ПО КАЖДОЙ УСЛУГЕ ===
  const SERVICES = {
    text2video: { price: 199, maxSeconds: 10, needsImage: false },
    text30:     { price: 999, maxSeconds: 30, needsImage: false },
    animate:    { price: 199, maxSeconds: 10, needsImage: true },
    toon:       { price: 299, maxSeconds: 10, needsImage: true },
    cartoon:    { price: 299, maxSeconds: 10, needsImage: true, allows: ['toon', 'animate'] },
    avatar:     { price: 499, maxSeconds: 10, needsImage: true },
    motion:     { price: 299, maxSeconds: 10, needsImage: true }
  };

  const service = body.service || 'text2video';
  const cfg = SERVICES[service];
  if (!cfg) {
    return res.status(400).json({ error: 'Неизвестная услуга' });
  }
  if (service === 'motion') {
    return res.status(501).json({ error: 'Услуга «Моушен контроль» скоро запустится' });
  }

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

    // ПРОВЕРКА СУММЫ: заплатил не меньше цены услуги
    const paid = parseFloat(pdata.amount && pdata.amount.value);
    if (pdata.currency !== 'RUB' || !(paid >= cfg.price)) {
      console.error('Payment mismatch:', paymentId, pdata.amount, 'service:', service);
      return res.status(403).json({ error: 'Сумма оплаты не соответствует выбранной услуге' });
    }
  }

  // === Данные для генерации ===
  const prompt = String(body.prompt || '').trim();
  const image = String(body.image || '');
  const orientation = body.orientation || '9:16';
  const size = String(body.size || '1280x720');
  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  let seconds = parseInt(body.seconds, 10);
  if (!seconds) seconds = (service === 'text30') ? 30 : 5;
  if (seconds > cfg.maxSeconds) seconds = cfg.maxSeconds;

  // === Проверки входных данных ===
  if (!cfg.needsImage && !prompt) {
    return res.status(400).json({ error: 'Нужен промпт' });
  }

  let img = null;
  if (cfg.needsImage) {
    if (!image) return res.status(400).json({ error: 'Нужно загрузить картинку' });
    img = parseImage(image);
    if (img.error) return res.status(400).json({ error: img.error });
  }

  try {
    const sizes = { '9:16': '720x1280', '16:9': '1280x720', '1:1': '720x720' };
    const form = new FormData();
    form.append('model', model);
    form.append('seconds', String(seconds));

    // === ОБРАБОТКА ПО УСЛУГАМ ===
    const effectiveService = (service === 'cartoon') ? 'animate' : service;

    if (effectiveService === 'avatar') {
      form.append('prompt', 'The person speaks naturally, slight head movements and expressions');
      form.append('size', sizes[orientation] || '720x1280');
      form.append('input_reference', new Blob([Buffer.from(img.base64, 'base64')], { type: img.mime }), 'avatar.jpg');

    } else if (effectiveService === 'animate') {
      form.append('prompt', prompt || 'The scene comes alive: natural smooth motion, gentle camera movement');
      form.append('size', sizes[orientation] || '1280x720');
      form.append('input_reference', new Blob([Buffer.from(img.base64, 'base64')], { type: img.mime }), 'photo.jpg');

    } else if (effectiveService === 'toon') {
      // toon использует Gemini (не видео), вернёт картинку
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

    } else {
      // text2video / text30
      form.append('prompt', prompt);
      form.append('size', size);
    }

    // === Общий вызов видео API (для avatar, animate) ===
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

// === Проверка картинки: формат JPG/PNG и размер до 10 МБ ===
function parseImage(image) {
  let mime = 'image/jpeg';
  let base64 = image;
  if (image.startsWith('data:')) {
    const comma = image.indexOf(',');
    if (comma === -1) return { error: 'Не удалось прочитать картинку' };
    const header = image.slice(0, comma);
    if (header.indexOf('image/png') !== -1) mime = 'image/png';
    else if (header.indexOf('image/jpeg') !== -1 || header.indexOf('image/jpg') !== -1) mime = 'image/jpeg';
    else return { error: 'Поддерживаются только JPG и PNG' };
    base64 = image.slice(comma + 1);
  }
  if (base64.length < 100) return { error: 'Не удалось прочитать картинку' };
  const bytes = Math.ceil(base64.length * 0.75);
  if (bytes > 10 * 1024 * 1024) return { error: 'Файл слишком большой (максимум 10 МБ)' };
  return { mime: mime, base64: base64 };
}
