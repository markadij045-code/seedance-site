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
    const r = await fetch('https://api.cometapi.com/volc/v3/contents/generations/tasks/' + taskId, {
      headers: { 'Authorization': 'Bearer ' + key }
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data.error && data.error.message) || data.error || data.message || 'Ошибка API';
      return res.status(502).json({ error: msg });
    }

    const status = data.status;

    if (status === 'succeeded') {
      const videoUrl =
        (data.result && (data.result.download_url || data.result.video_url)) ||
        data.download_url ||
        data.video_url;
      return res.json({ status: 'succeeded', videoUrl: videoUrl });
    }

    if (status === 'failed') {
      return res.json({ status: 'failed', error: data.error || 'генерация не удалась' });
    }

    return res.json({ status: status || 'processing' });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с API: ' + e.message });
  }
}
