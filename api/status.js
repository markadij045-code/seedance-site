const API_BASE = 'https://api.cometapi.com';

export default async function handler(req, res) {
  const key = process.env.COMETAPI_KEY;
  if (!key) return res.status(500).json({ error: 'Не настроен ключ API' });

  const taskId = req.query.taskId;
  if (!taskId) return res.status(400).json({ error: 'Нет taskId' });

  try {
    const r = await fetch(`${API_BASE}/volc/v3/contents/generations/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error || 'Ошибка API' });

    const status = data.status;
    if (status === 'succeeded') {
      const videoUrl = data.result?.download_url || data.result?.video_url || data.download_url;
      return res.json({ status: 'succeeded', videoUrl });
    }
    if (status === 'failed') {
      return res.json({ status: 'failed', error: data.error || 'генерация не удалась' });
    }
    return res.json({ status: status || 'processing' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
