import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const API_DIR = path.join(__dirname, 'api');
const PORT = Number(process.env.PORT || 3000);

// --- читаем .env сами, чтобы не зависеть от версии Node и настроек pm2 ---
try {
  const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
} catch (e) {
  console.error('[env] не удалось прочитать .env:', e.message);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json'
};

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';
  let filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  let st = await fs.promises.stat(filePath).catch(() => null);
  if (st && st.isDirectory()) { filePath = path.join(filePath, 'index.html'); st = await fs.promises.stat(filePath).catch(() => null); }
  if (!st && !path.extname(filePath)) {
    const alt = filePath + '.html';
    const st2 = await fs.promises.stat(alt).catch(() => null);
    if (st2) { filePath = alt; st = st2; }
  }
  if (!st || !st.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
  const ext = path.extname(filePath).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size };
  if (ext === '.html') headers['Cache-Control'] = 'no-cache';
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

const handlerCache = new Map();
async function getHandler(name) {
  if (!/^[a-z0-9-]+$/i.test(name)) return null;
  const file = path.join(API_DIR, name + '.js');
  if (!fs.existsSync(file)) return null;
  if (!handlerCache.has(name)) {
    const mod = await import(pathToFileURL(file).href);
    handlerCache.set(name, mod.default || null);
  }
  return handlerCache.get(name);
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const u = new URL(req.url, 'http://localhost');
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  try {
    if (u.pathname.startsWith('/api/')) {
      const name = u.pathname.slice(5).replace(/\.js$/, '');
      const handler = await getHandler(name);
      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'not found' }));
      }
      await handler(req, res);
      if (!res.writableEnded) res.end();
      return;
    }
    await serveStatic(req, res, u.pathname);
  } catch (e) {
    console.error('[error]', req.url, e);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    if (!res.writableEnded) res.end(JSON.stringify({ error: 'server error' }));
  }
});

// длинные генерации видео не должны обрываться по таймауту Node
server.timeout = 0;
server.requestTimeout = 0;
server.headersTimeout = 650000;
server.keepAliveTimeout = 60000;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] слушает http://127.0.0.1:${PORT} (статика: public/, api: api/)`);
});
