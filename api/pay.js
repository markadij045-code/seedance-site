export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    return res.status(500).json({ error: 'ЮKassa не настроена' });
  }

  const body = req.body || {};
  const service = body.service || 'text2video';
  const prompt = body.prompt || '';

  const BASE = { text2video: 199, motion: 199, lipsync: 199, cartoon: 299, animate: 299 };
  const PER_SEC = 30;
  const QUALITY_SURCHARGE = { '480p': 0, '720p': 200, '1080p': 300 };
  const QUALITY_SERVICES = { text2video: true, cartoon: true, animate: true };

  let seconds = parseInt(body.seconds, 10);
  let quality = (body.quality === '720p' || body.quality === '1080p') ? body.quality : '480p';
  const surcharge = QUALITY_SERVICES[service] ? QUALITY_SURCHARGE[quality] : 0;

  let price;
  if (service === 'avatar') {
    seconds = 0;
    price = { amount: '499.00', desc: 'Говорящий аватар SeedGen' };
  } else if (BASE[service]) {
    if (!seconds || seconds < 5) seconds = 5;
    if (seconds > 30) seconds = 30;
    const amount = BASE[service] + (seconds - 5) * PER_SEC + surcharge;
    const names = { text2video: 'Создать видео', motion: 'Моушен контроль', lipsync: 'Липсинк (дубляж)', cartoon: 'Мультфильм из фото', animate: 'Мультфильм: оживление' };
    const qLabel = (QUALITY_SERVICES[service] && quality !== '480p') ? ', ' + quality : '';
    price = { amount: amount + '.00', desc: names[service] + ', ' + seconds + ' сек' + qLabel + ' SeedGen' };
  } else {
    seconds = 5;
    price = { amount: '199.00', desc: 'Видео SeedGen' };
  }

  const returnUrls = {
    'text2video': 'https://seedgen.ru/gen.html',
    'animate':    'https://seedgen.ru/cartoon.html',
    'cartoon':    'https://seedgen.ru/cartoon.html',
    'avatar':     'https://seedgen.ru/avatar.html',
    'motion':     'https://seedgen.ru/motion.html',
    'lipsync':    'https://seedgen.ru/lipsync.html'
  };
  const returnUrl = returnUrls[service] || 'https://seedgen.ru/';

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
        confirmation: { type: 'redirect', return_url: returnUrl },
        description: price.desc,
        metadata: { service: service, prompt: prompt, seconds: String(seconds), quality: quality }
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
