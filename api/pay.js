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
  const seconds = String((req.body && req.body.seconds) || '');

  // === Цены моушен контроля по секундам ===
  const MOTION = {
    '5': '199.00',
    '10': '349.00',
    '15': '499.00',
    '20': '649.00',
    '25': '799.00',
    '30': '949.00'
  };

  const prices = {
    'text2video': { amount: '199.00', desc: 'Видео до 5 секунд SeedGen' },
    'text30': { amount: '999.00', desc: 'Видео до 30 секунд SeedGen' },
    'animate': { amount: '199.00', desc: 'Оживи картинку SeedGen' },
    'cartoon': { amount: '299.00', desc: 'Мультфильм из фото SeedGen' },
    'avatar': { amount: '499.00', desc: 'Говорящий аватар SeedGen' },
    'lipsync': { amount: '199.00', desc: 'Липсинк (дубляж) SeedGen' }
  };

  let price;
  if (service === 'motion') {
    const s = MOTION[seconds] ? seconds : '10';
    price = { amount: MOTION[s], desc: 'Моушен контроль ' + s + ' сек SeedGen' };
  } else {
    price = prices[service] || prices['text2video'];
  }

  const returnUrls = {
    'text2video': 'https://seedance-site-nu.vercel.app/',
    'text30': 'https://seedance-site-nu.vercel.app/',
    'animate': 'https://seedance-site-nu.vercel.app/photo.html',
    'cartoon': 'https://seedance-site-nu.vercel.app/cartoon.html',
    'avatar': 'https://seedance-site-nu.vercel.app/avatar.html',
    'motion': 'https://seedance-site-nu.vercel.app/motion.html',
    'lipsync': 'https://seedance-site-nu.vercel.app/lipsync.html'
  };

  const returnUrl = returnUrls[service] || 'https://seedance-site-nu.vercel.app/';

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
          return_url: returnUrl
        },
        description: price.desc,
        metadata: { service: service, prompt: prompt, seconds: seconds }
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
