import { handleUpload } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({ hasToken: !!process.env.BLOB_READ_WRITE_TOKEN });
  }
  try {
    const blob = await handleUpload({ req, res });
    res.status(200).json(blob);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки' });
  }
}
