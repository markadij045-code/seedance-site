import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  try {
    const jsonResponse = await handleUpload({
      req,
      res,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4'
          ],
          maximumSizeInBytes: 20 * 1024 * 1024
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // ничего не делаем, файл уже в хранилище
      }
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
