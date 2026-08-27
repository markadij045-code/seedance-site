export default async function handler(req, res) {
  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API' });
  }

  const taskId = req.query.taskId;
  if (!taskId) {
    return res.status(400).json({ error: 'Нет taskId' });
  }

  try {
    const r = await fetch('https://api.cometapi.com/v1/videos/' + taskId, {
      headers: { 'Authorization': 'Bearer ' + key }
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data.error && (data.error.message || data.error)) || data.message || 'Ошибка API';
      return res.status(502).json({ error: msg });
    }

    const st = data.status;

    if (st === 'completed' || st === 'succeeded') {
      const videoUrl = data.url || data.video_url ||
        (data.content && data.content.url) ||
        ('/api/video?taskId=' + taskId);
      return res.json({ status: 'succeeded', videoUrl: videoUrl });
    }

    if (st === 'failed' || st === 'error') {
      return res.json({ status: 'failed', error: data.error || data.last_error || 'генерация не удалась' });
    }

    return res.json({ status: 'processing' });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с API: ' + e.message });
  }
}
