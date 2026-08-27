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

  const model = process.env.SEEDANCE_MODEL || 'doubao-seedance-2-5';

  try {
    const r = await fetch('https://api.cometapi.com/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
           body: JSON.stringify({
        model: model,
        prompt: prompt,
        seconds: '5'
      })
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
