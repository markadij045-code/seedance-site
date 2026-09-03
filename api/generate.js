export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });
  }

  // Проверка пароля (для ручных тестов владельца)
  const isAdmin = !!process.env.ADMIN_SECRET && req.body && req.body.adminPassword === process.env.ADMIN_SECRET;
  
  const prompt = (req.body && req.body.prompt) || '';
  const image = (req.body && req.body.image) || '';
  const service = (req.body && req.body.service) || 'text2video';
  const orientation = (req.body && req.body.orientation) || '9:16';
  const seconds = String(req.body.seconds || '10');
  const size = String(req.body.size || '1280x720');
  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  // Если не админ и нет данных для услуги — ошибка
  if (!isAdmin && !image && service === 'avatar') {
    return res.status(400).json({ error: 'Нужно фото' });
  }

  try {
    // === УСЛУГА: Говорящий аватар (после оплаты) ===
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
      if (!taskId) {
        return res.status(502).json({ error: 'API не вернул ID задачи' });
      }
      
      return res.json({ taskId: taskId });
    }

    // === СТАРЫЙ РЕЖИМ: видео из текста (для админа или для оплаты text2video) ===
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
    if (!taskId) {
      return res.status(502).json({ error: 'API не вернул ID задачи' });
    }

    return res.json({ taskId: taskId });

  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с API: ' + e.message });
  }
}
