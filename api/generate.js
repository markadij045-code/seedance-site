const API_BASE = 'https://api.cometapi.com';
// Если провайдер скажет, что ID модели другой — поменяй здесь
const MODEL = process.env.SEEDANCE_MODEL || 'seedance-2-5';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const key = process.env.COMETAPI_KEY;
  if (!key) return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Нужен промпт' });

  try {
    const r = await fetch(`${API_BASE}/volc/v3/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        content: [{ type: 'text', text: prompt }],
        output: { resolution: '720p', duration_s: 5 }
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error?.message || data.error || 'Ошибка API' });

    const taskId = data.id || data.task_id;
    if (!taskId) return res.status(502).json({ error: 'API не вернул ID задачи' });

    return res.json({ taskId });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с API: ' + e.message });
  }
}
