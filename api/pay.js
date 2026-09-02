export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    return res.status(500).json({ error: 'ЮKassa не настроена' });
  }

  const service = (req.body && req.body.service) || 'text2video';
  const prompt = (req.body && req.body.prompt) || '';
  const imageData = (req.body && req.body.image) || '';
  
  // Прайс-лист
  const prices = {
    'text2video': { amount: '199.00', desc: 'Видео из текста SeedGen' },
    'animate': { amount: '199.00', desc: 'Оживи картинку SeedGen' },
    'cartoon': { amount: '299.00', desc: 'Мультфильм из фото SeedGen' },
    'avatar': { amount: '499.00', desc: 'Говорящий аватар SeedGen' }
  };
  
  const price = prices[service] || prices['text2video'];

  const auth = 'Basic ' + Buffer.from(shopId + ':' + secret).toString('base64');

  try {
    const r = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Idempotence-Key': 'pay-' + Date.now() + '-' + Math.random().toString(36).slice(2)
      },
      body: JSON.stringify({
        amount: { value: price.amount, currency: 'RUB' },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: 'https://seedance-site-nu.vercel.app/'
        },
        description: price.desc,
        metadata: { service: service, prompt: prompt, image: imageData ? 'yes' : 'no' }
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = data.description || (data.error && data.error.message) || 'Ошибка ЮKassa';
      return res.status(502).json({ error: msg });
    }

    return res.json({
      paymentId: data.id,
      confirmationUrl: data.confirmation && data.confirmation.confirmation_url
    });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с ЮKassa: ' + e.message });
  }
}
