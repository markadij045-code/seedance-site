export default async function handler(req, res) {
  if (req.method === 'GET') {
    const info = { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, importError: null };
    try {
      await import('@vercel/blob');
      info.importOk = true;
    } catch (e) {
      info.importError = String((e && e.message) || e);
    }
    return res.json(info);
  }
  try {
    const { handleUpload } = await import('@vercel/blob');
    const blob = await handleUpload({ req, res });
    res.status(200).json(blob);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки' });
  }
}
