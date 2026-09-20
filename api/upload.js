export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const mp = url.searchParams.get('mp');

  if (req.method === 'GET') {
    return res.json({ hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, putMode: true, mpMode: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Только POST' });

  try {
    const mod = await import('@vercel/blob');
    const put = mod.put || (mod.default && mod.default.put);
    const createMp = mod.createMultipartUpload || (mod.default && mod.default.createMultipartUpload);
    const uploadPartFn = mod.uploadPart || (mod.default && mod.default.uploadPart);
    const completeMp = mod.completeMultipartUpload || (mod.default && mod.default.completeMultipartUpload);

    async function readBody() {
      const chunks = [];
      req.on('data', function(c){ chunks.push(c); });
      await new Promise(function(ok, bad){ req.on('end', ok); req.on('error', bad); });
      return Buffer.concat(chunks);
    }

    if (url.searchParams.get('put') === '1' && !mp) {
      const buf = await readBody();
      if (!buf.length) return res.status(400).json({ error: 'Пустой файл' });
      if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Файл больше 4 МБ — нужен кусочный режим' });
      const name = String(url.searchParams.get('name') || ('file-' + Date.now()));
      const type = String(url.searchParams.get('type') || 'application/octet-stream');
      const safe = name.replace(/[^\w.\-()]+/g, '_');
      const blob = await put(safe, buf, { access: 'public', contentType: type, addRandomSuffix: true });
      return res.status(200).json({ url: blob.url, pathname: blob.pathname });
    }

    if (mp === 'create') {
      const key = String(url.searchParams.get('name') || ('file-' + Date.now())).replace(/[^\w.\-()]+/g, '_');
      const type = String(url.searchParams.get('type') || 'application/octet-stream');
      const up = await createMp(key, { access: 'public', contentType: type, addRandomSuffix: true });
      return res.status(200).json({ key: up.key, uploadId: up.uploadId });
    }

    if (mp === 'part') {
      const key = String(url.searchParams.get('key') || '');
      const uploadId = String(url.searchParams.get('uploadId') || '');
      const partNumber = parseInt(url.searchParams.get('partNumber') || '1', 10);
      const buf = await readBody();
      if (!buf.length) return res.status(400).json({ error: 'Пустая часть' });
      const part = await uploadPartFn(key, uploadId, partNumber, buf);
      return res.status(200).json({ etag: part.etag, partNumber: part.partNumber });
    }

    if (mp === 'complete') {
      const raw = await readBody();
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const blob = await completeMp(body.key, body.uploadId, body.parts);
      return res.status(200).json({ url: blob.url, pathname: blob.pathname });
    }

    return res.status(500).json({ error: 'Старый поток с токеном больше не поддерживается' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
