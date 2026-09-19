export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET') {
    return res.json({ hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, putMode: true });
  }
  if (req.method === 'POST' && url.searchParams.get('put') === '1') {
    try {
      const name = String(url.searchParams.get('name') || ('file-' + Date.now()));
      const type = String(url.searchParams.get('type') || req.headers['content-type'] || 'application/octet-stream');
      const chunks = [];
      req.on('data', function(c){ chunks.push(c); });
      await new Promise(function(ok, bad){ req.on('end', ok); req.on('error', bad); });
      const buf = Buffer.concat(chunks);
      if (!buf.length) return res.status(400).json({ error: 'Пустой файл' });
      if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Файл больше 4 МБ — возьми ролик покороче' });
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
  return res.status(500).json({ error: 'Старый поток с токеном больше не поддерживается' });
}
