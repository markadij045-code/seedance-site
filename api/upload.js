import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/wav'
          ],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url);
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Blob upload error:', error);
    return res.status(400).json({ error: error.message });
  }
}
