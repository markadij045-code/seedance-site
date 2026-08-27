export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });
  }

  const prompt = (req.body && req.body.prompt) || '';
  if (!prompt) {
    return res.status(400).json({ error: 'Нужен промпт' });
  }

  const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

  try {
    const r = await fetch('https://api.cometapi.com/volc/v3/contents/generations/tasks', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        content: [{ type: 'text', text: prompt }],
        output: { resolution: '720p', duration_s: 5 }
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data.error && data.error.message) || data.error || data.message || 'Ошибка API';
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
