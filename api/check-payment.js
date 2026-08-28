export default async function handler(req, res) {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    return res.status(500).json({ error: 'ЮKassa не настроена' });
  }

  const paymentId = req.query.paymentId;
  if (!paymentId) {
    return res.status(400).json({ error: 'Нет paymentId' });
  }

  const auth = 'Basic ' + Buffer.from(shopId + ':' + secret).toString('base64');

  try {
    const r = await fetch('https://api.yookassa.ru/v3/payments/' + paymentId, {
      headers: { 'Authorization': auth }
    });
    const data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ error: 'Не удалось проверить платёж' });
    }

    if (data.status !== 'succeeded') {
      return res.json({ paid: false, status: data.status });
    }

    const prompt = (data.metadata && data.metadata.prompt) || '';
    if (!prompt) {
      return res.json({ paid: true, error: 'в платеже нет промпта' });
    }

    const key = process.env.COMETAPI_KEY;
    const model = process.env.SEEDANCE_MODEL || 'seedance-2-5';

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('model', model);
    form.append('seconds', '4');
    form.append('size', '848x480');

    const gr = await fetch('https://api.cometapi.com/v1/videos', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key },
      body: form
    });
    const gdata = await gr.json();

    if (!gr.ok) {
      const msg = (gdata.error && (gdata.error.message || gdata.error)) || gdata.message || 'Ошибка API генерации';
      return res.json({ paid: true, error: msg });
    }

    const taskId = gdata.id || gdata.task_id;
    return res.json({ paid: true, taskId: taskId });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
