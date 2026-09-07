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
  let seconds = String(body.seconds || '');

  // Единая таблица 6 тарифов (для text2video, motion, cartoon, lipsync)
  const T6 = {
    '5':  '199.00',
    '10': '349.00',
    '15': '499.00',
    '20': '649.00',
    '25': '799.00',
    '30': '949.00'
  };

  // Цены мультфильма (отдельные)
  const CARTOON = {
    '5':  '299.00',
    '10': '449.00',
    '15': '599.00',
    '20': '749.00',
    '25': '899.00',
    '30': '1049.00'
  };

  // Фиксированные услуги
  const FIX = {
    'text30': { amount: '999.00', desc: 'Видео до 30 секунд SeedGen' },
    'animate': { amount: '199.00', desc: 'Оживи картинку SeedGen' },
    'avatar':  { amount: '499.00', desc: 'Говорящий аватар SeedGen' }
  };

  let price;
  if (service === 'text2video') {
    const s = T6[seconds] ? seconds : '5';
    seconds = s;
    price = { amount: T6[s], desc: 'Создать видео ' + s + ' сек SeedGen' };
  } else if (service === 'motion') {
    const s = T6[seconds] ? seconds : '10';
    seconds = s;
    price = { amount: T6[s], desc: 'Моушен контроль ' + s + ' сек SeedGen' };
  } else if (service === 'cartoon') {
    const s = CARTOON[seconds] ? seconds : '5';
    seconds = s;
    price = { amount: CARTOON[s], desc: 'Мультфильм из фото ' + s + ' сек SeedGen' };
  } else if (service === 'lipsync') {
    const s = T6[seconds] ? seconds : '5';
    seconds = s;
    price = { amount: T6[s], desc: 'Липсинк (дубляж) ' + s + ' сек SeedGen' };
  } else {
    price = FIX[service] || { amount: '199.00', desc: 'Видео SeedGen' };
  }

  const returnUrls = {
    'text2video': 'https://seedgen.ru/gen.html',
    'text30':     'https://seedgen.ru/gen.html',
    'animate':    'https://seedgen.ru/photo.html',
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
