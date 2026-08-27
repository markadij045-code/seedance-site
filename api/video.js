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
    const r = await fetch('https://api.cometapi.com/v1/videos/' + taskId + '/content', {
      headers: { 'Authorization': 'Bearer ' + key }
    });

    if (!r.ok) {
      return res.status(502).json({ error: 'Не удалось получить видео' });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'video/mp4');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
