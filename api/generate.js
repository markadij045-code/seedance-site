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

  // === ЗАЩИТА: без пароля владельца нужен ОПЛАЧЕННЫЙ платёж ===
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
  }

  // === Данные для генерации ===
  const prompt = body.prompt || '';
  const image = body.image || '';
  const service = body.service || 'text2video';
  const orientation = body.orientation || '9:16';
  const seconds = String(body.seconds || '10');
  const size = String(body.size || '1280x720');
  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  try {
    // === АВАТАР: оживление фото ===
    if (service === 'avatar' && image) {
      const sizes = { '9:16': '720x1280', '16:9': '1280x720', '1:1': '720x720' };
      const buf = Buffer.from(image, 'base64');
      const blob = new Blob([buf], { type: 'image/jpeg' });

      const form = new FormData();
      form.append('prompt', 'The person speaks naturally, slight head movements and expressions');
      form.append('model', model);
      form.append('seconds', '10');
      form.append('size', sizes[orientation] || '720x1280');
      form.append('input_reference', blob, 'avatar.jpg');

      const r = await fetch('https://api.cometapi.com/v1/videos', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key },
        body: form
      });
      const data = await r.json();

      if (!r.ok) {
        const msg = (data.error && (data.error.message || data.error)) || data.message || 'Ошибка API';
        return res.status(502).json({ error: msg });
      }
      const taskId = data.id || data.task_id;
      if (!taskId) return res.status(502).json({ error: 'API не вернул ID задачи' });
      return res.json({ taskId: taskId });
    }

    // === ВИДЕО ИЗ ТЕКСТА ===
    if (!prompt) {
      return res.status(400).json({ error: 'Нужен промпт' });
    }

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('model', model);
    form.append('seconds', seconds);
    form.append('size', size);

    const r = await fetch('https://api.cometapi.com/v1/videos', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key },
      body: form
    });
    const data = await r.json();

    if (!r.ok) {
      const msg = (data.error && (data.error.message || data.error)) || data.message || 'Ошибка API';
      return res.status(502).json({ error: msg });
    }
    const taskId = data.id || data.task_id;
    if (!taskId) return res.status(502).json({ error: 'API не вернул ID задачи' });
    return res.json({ taskId: taskId });

  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с API: ' + e.message });
  }
}
