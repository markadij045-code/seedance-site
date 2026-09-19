export default async function handler(req, res) {
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Только POST' }); }
  try {
    const name = String(req.query.name || ('file-' + Date.now()));
    const type = String(req.query.type || 'application/octet-stream');
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buf = Buffer.concat(chunks);
    if (!buf.length) return res.status(400).json({ error: 'Пустой файл' });
    if (buf.length > 60 * 1024 * 1024) return res.status(413).json({ error: 'Файл больше 60 МБ' });
    const mod = await import('@vercel/blob');
    const put = mod.put || (mod.default && mod.default.put);
    if (!put) return res.status(500).json({ error: 'put not found' });
    const safe = name.replace(/[^\w.\-()]+/g, '_');
    const blob = await put(safe, buf, { access: 'public', contentType: type, addRandomSuffix: true });
    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
