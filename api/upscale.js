export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }
  const key = process.env.COMETAPI_KEY;
  if (!key) return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });

  const videoUrl = String((req.body || {}).videoUrl || '');
  if (videoUrl.indexOf('http') !== 0) {
    return res.status(400).json({ error: 'Нет видео для улучшения' });
  }

  const form = new FormData();
  form.append('model', 'runwayml_upscale_video');
  form.append('video', videoUrl);

  const r = await fetch('https://api.cometapi.com/v1/videos', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key },
    body: form
  });
  const data = await r.json().catch(function(){ return {}; });
  if (!r.ok) {
    return res.status(502).json({ error: 'Улучшение качества временно недоступно, попробуйте 720p' });
  }
  const taskId = data.id || data.task_id;
  if (!taskId) {
    return res.status(502).json({ error: 'Улучшение качества временно недоступно, попробуйте 720p' });
  }
  return res.json({ taskId: taskId });
}
