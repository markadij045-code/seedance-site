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

    return res.json({ paid: true });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
