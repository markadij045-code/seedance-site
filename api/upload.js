export default async function handler(req, res) {
  let mod;
  try {
    mod = await import('@vercel/blob');
  } catch (e) {
    return res.status(500).json({ error: 'import failed: ' + String((e && e.message) || e) });
  }
  const handleUpload = mod.handleUpload || (mod.default && mod.default.handleUpload);
  if (req.method === 'GET') {
    return res.json({
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasHandleUpload: !!handleUpload,
      keys: Object.keys(mod).slice(0, 30)
    });
  }
  if (!handleUpload) {
    return res.status(500).json({ error: 'handleUpload not found; keys: ' + Object.keys(mod).join(',') });
  }
  try {
    await handleUpload({ req, res });
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || 'Ошибка загрузки' });
    }
  }
}
