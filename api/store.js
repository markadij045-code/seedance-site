import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });
  try {
    const b = req.body || {};
    const name = String(b.name || '').replace(/[^a-z0-9.\-]/gi, '').slice(0, 80);
    const base64 = String(b.base64 || '');
    const contentType = String(b.contentType || 'application/octet-stream');
    if (!name || !base64) return res.status(400).json({ error: 'Нет данных' });
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Файл больше 4 МБ — выбери файл поменьше' });
    const blob = await put(name, buf, { access: 'public', contentType: contentType });
    return res.json({ url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: 'Ошибка загрузки' });
  }
}
