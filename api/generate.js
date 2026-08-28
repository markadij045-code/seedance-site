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
    return res.status(403).json({ error: 'Генерация доступна только после оплаты' });
  }

  const prompt = (req.body && req.body.prompt) || '';
  if (!prompt) {
    return res.status(400).json({ error: 'Нужен промпт' });
  }

  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';
  const seconds = String(req.body.seconds || '10');
  const size = String(req.body.size || '1280x720');

  try {
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
