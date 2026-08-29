export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API (COMETAPI_KEY)' });
  }

  const isAdmin = !!process.env.ADMIN_SECRET && req.body && req.body.adminPassword === process.env.ADMIN_SECRET;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Пока доступно только владельцу (введи пароль)' });
  }

  const image = req.body && req.body.image;
  if (!image) {
    return res.status(400).json({ error: 'Нужна картинка' });
  }

  const stylePrompt = 'Transform this photo into a 3D animated movie character in Pixar style. Keep the person recognizable but clearly cartoonish. Bright friendly colors, clean simple background.';

  try {
    const r = await fetch('https://api.cometapi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: stylePrompt },
              { inlineData: { mimeType: 'image/jpeg', data: image } }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '1:1' }
        }
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data.error && (data.error.message || data.error)) || data.message || 'Ошибка API';
      return res.status(502).json({ error: msg });
    }

    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    if (!parts) {
      return res.status(502).json({ error: 'API не вернул результат' });
    }

    let finalImage = null;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.thought === true) { continue; }
      if (p.inlineData && p.inlineData.data) {
        finalImage = p.inlineData;
        break;
      }
    }

    if (!finalImage) {
      return res.status(502).json({ error: 'Картинка не создана' });
    }

    return res.json({ image: finalImage.data, mime: finalImage.mimeType || 'image/png' });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с API: ' + e.message });
  }
}
