export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });
  }

  const isAdmin = !!process.env.ADMIN_SECRET && req.body && req.body.adminPassword === process.env.ADMIN_SECRET;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Пока доступно только владельцу (введи пароль)' });
  }

  const image = req.body && req.body.image;
  const prompt = (req.body && req.body.prompt) || 'Animate this image, cinematic motion';
  if (!image) {
    return res.status(400).json({ error: 'Нужна картинка' });
  }

  try {
    const buf = Buffer.from(image, 'base64');
    const blob = new Blob([buf], { type: 'image/jpeg' });

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('model', process.env.SEEDANCE_MODEL || 'seedance-2-5');
    form.append('seconds', '4');
    form.append('size', '720x1280');
    form.append('input_reference', blob, 'photo.jpg');

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
