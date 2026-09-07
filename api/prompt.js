export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }
  const key = process.env.COMETAPI_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Не настроен ключ API' });
  }
  const raw = String((req.body && req.body.prompt) || '').trim();
  if (raw.length < 10) {
    return res.status(400).json({ error: 'Слишком короткое описание' });
  }
  if (raw.length > 500) {
    return res.status(400).json({ error: 'Слишком длинное описание' });
  }
  try {
    const r = await fetch('https://api.cometapi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'You are a prompt-improver for a text-to-video AI. Rewrite the user\'s rough Russian description into ONE vivid cinematic Russian prompt (1-2 sentences): subject, action, place, lighting, style. No quotes, no explanations, only the final prompt. User draft: ' + raw }] }],
        generationConfig: { responseModalities: ['TEXT'] }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: 'Улучшатель недоступен' });
    }
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    let out = '';
    if (parts) {
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].thought) continue;
        if (parts[i].text) { out += parts[i].text; }
      }
    }
    out = out.trim();
    if (!out) {
      return res.status(502).json({ error: 'Улучшатель недоступен' });
    }
    return res.json({ prompt: out });
  } catch (e) {
    return res.status(500).json({ error: 'Улучшатель недоступен' });
  }
}
