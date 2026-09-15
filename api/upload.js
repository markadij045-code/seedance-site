import { handleUpload } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const blob = await handleUpload({ req, res });
    res.status(200).json(blob);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки' });
  }
}
