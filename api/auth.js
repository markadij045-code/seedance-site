import { registerUser, loginUser, userByToken, logoutToken, listPresets, savePreset, deletePreset } from '../lib/users.js';

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });
  const b = req.body || {};
  try{
    if(b.action === 'register'){
      const email = String(b.email || '').trim();
      const password = String(b.password || '');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Введи корректный e-mail' });
      if(password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
      const r = await registerUser(email, password);
      if(r.error) return res.status(400).json(r);
      return res.json({ token: r.token, email: r.email });
    }
    if(b.action === 'login'){
      const r = await loginUser(String(b.email || ''), String(b.password || ''));
      if(r.error) return res.status(400).json(r);
      return res.json({ token: r.token, email: r.email });
    }
    if(b.action === 'me'){
      const u = await userByToken(b.token);
      if(!u) return res.status(401).json({ error: 'Сессия истекла — войди заново' });
      return res.json({ email: u.email });
    }
    if(b.action === 'logout'){
      await logoutToken(b.token);
      return res.json({ ok: true });
    }
    if(b.action === 'presets-list'){
      const u = await userByToken(b.token);
      if(!u) return res.status(401).json({ error: 'Нужен вход' });
      return res.json({ presets: await listPresets(u.email) });
    }
    if(b.action === 'presets-save'){
      const u = await userByToken(b.token);
      if(!u) return res.status(401).json({ error: 'Нужен вход' });
      const p = b.preset || {};
      if(!p.image || !p.audio) return res.status(400).json({ error: 'Для ведущего нужны фото и озвучка' });
      p.name = String(p.name || 'Мой ведущий').slice(0, 40);
      const presets = await savePreset(u.email, { name: p.name, image: p.image, audio: p.audio, audioName: p.audioName || null, orientation: p.orientation || '9:16' });
      return res.json({ presets: presets });
    }
    if(b.action === 'presets-del'){
      const u = await userByToken(b.token);
      if(!u) return res.status(401).json({ error: 'Нужен вход' });
      return res.json({ presets: await deletePreset(u.email, String(b.id || '')) });
    }
    return res.status(400).json({ error: 'Неизвестная команда' });
  }catch(e){
    return res.status(500).json({ error: 'Ошибка сервера, попробуй ещё раз' });
  }
}
