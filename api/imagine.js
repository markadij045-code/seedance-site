import { getBalance } from '../lib/ledger.js';

const MODELS = {
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-2': 'gemini-3.1-flash-image-preview'
};

const ASPECTS = { '1:1': '1:1', '16:9': '16:9', '9:16': '9:16', '4:3': '4:3', '3:4': '3:4' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }
  const key = process.env.COMETAPI_KEY;
  if (!key) return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });

  const body = req.body || {};
  if (!process.env.ADMIN_SECRET || body.adminPassword !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  if (body.verifyOnly) {
    return res.json({ ok: true });
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Нужен промпт' });

  const modelKey = MODELS[body.model] ? body.model : 'nano-banana';
  const modelId = MODELS[modelKey];
  const aspect = ASPECTS[body.aspect] || '1:1';

  const bal = await getBalance();
  if (bal !== null && bal < 0.06) {
    return res.status(503).json({ error: 'Ресурсы генерации недоступны: пополнить баланс CometAPI' });
  }

  const parts = [{ text: prompt }];
  if (typeof body.refImage === 'string' && body.refImage.length > 100) {
    let b64 = body.refImage;
    let mime = 'image/jpeg';
    if (b64.startsWith('data:')) {
      const comma = b64.indexOf(',');
      const header = b64.slice(0, comma);
      b64 = b64.slice(comma + 1);
      if (header.indexOf('image/png') !== -1) mime = 'image/png';
      else if (header.indexOf('image/webp') !== -1) mime = 'image/webp';
    }
    parts.push({ inlineData: { mimeType: mime, data: b64 } });
  }

  try {
    const r = await fetch('https://api.cometapi.com/v1beta/models/' + modelId + ':generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspect } }
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Модель отказала: ' + ((data && data.error && data.error.message) || 'попробуй ещё раз') });
    const outParts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    let finalImage = null;
    if (outParts) {
      for (let i = outParts.length - 1; i >= 0; i--) {
        if (outParts[i].thought) continue;
        if (outParts[i].inlineData && outParts[i].inlineData.data) { finalImage = outParts[i].inlineData; break; }
      }
    }
    if (!finalImage) return res.status(502).json({ error: 'Модель не вернула картинку, попробуй другой промпт' });
    return res.json({ image: finalImage.data, mime: finalImage.mimeType || 'image/png', model: modelKey });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с моделью' });
  }
}
