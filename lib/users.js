import { put, list } from '@vercel/blob';
import crypto from 'crypto';

function sha(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function secret(){ return sha(process.env.BLOB_READ_WRITE_TOKEN || 'seedgen').slice(0, 24); }
const USERS_FILE = () => 'users-' + secret() + '.json';

async function readJSON(pathname, fallback){
  try{
    const { blobs } = await list({ prefix: pathname });
    const url = blobs && blobs[0] && blobs[0].url;
    if(!url) return fallback;
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) return fallback;
    return await r.json();
  }catch(e){ return fallback; }
}
async function writeJSON(pathname, data){
  await put(pathname, JSON.stringify(data), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
}

export async function readUsers(){
  const d = await readJSON(USERS_FILE(), { users: [], sessions: [] });
  if(!Array.isArray(d.users)) d.users = [];
  if(!Array.isArray(d.sessions)) d.sessions = [];
  return d;
}
export const writeUsers = (d) => writeJSON(USERS_FILE(), d);

export function hashPassword(password, salt){ return sha(salt + ':' + password); }

export async function registerUser(email, password){
  const data = await readUsers();
  const norm = String(email).trim().toLowerCase();
  if(data.users.some(u => u.email === norm)) return { error: 'Такой e-mail уже зарегистрирован — попробуй войти' };
  const salt = crypto.randomBytes(8).toString('hex');
  const user = { email: norm, salt: salt, hash: hashPassword(password, salt), createdAt: Date.now() };
  data.users.push(user);
  const token = crypto.randomBytes(24).toString('hex');
  data.sessions.push({ token: token, email: norm, createdAt: Date.now() });
  await writeUsers(data);
  return { token: token, email: norm };
}

export async function loginUser(email, password){
  const data = await readUsers();
  const norm = String(email).trim().toLowerCase();
  const user = data.users.find(u => u.email === norm);
  if(!user) return { error: 'Такого аккаунта нет — зарегистрируйся' };
  if(user.hash !== hashPassword(password, user.salt)) return { error: 'Неверный e-mail или пароль' };
  const token = crypto.randomBytes(24).toString('hex');
  data.sessions.push({ token: token, email: norm, createdAt: Date.now() });
  data.sessions = data.sessions.slice(-200);
  await writeUsers(data);
  return { token: token, email: norm };
}

export async function userByToken(token){
  if(!token) return null;
  const data = await readUsers();
  const s = data.sessions.find(x => x.token === token);
  if(!s) return null;
  return data.users.find(u => u.email === s.email) || null;
}

export async function logoutToken(token){
  const data = await readUsers();
  data.sessions = data.sessions.filter(x => x.token !== token);
  await writeUsers(data);
  return true;
}

function presetsFile(email){ return 'p-' + sha(secret() + ':' + email).slice(0, 24) + '.json'; }

export async function listPresets(email){
  const d = await readJSON(presetsFile(email), { presets: [] });
  return Array.isArray(d.presets) ? d.presets : [];
}
export async function savePreset(email, preset){
  const d = { presets: await listPresets(email) };
  preset.id = 'pr' + Date.now();
  preset.createdAt = Date.now();
  d.presets.unshift(preset);
  d.presets = d.presets.slice(0, 6);
  await writeJSON(presetsFile(email), d);
  return d.presets;
}
export async function deletePreset(email, id){
  const d = { presets: (await listPresets(email)).filter(p => p.id !== id) };
  await writeJSON(presetsFile(email), d);
  return d.presets;
}
