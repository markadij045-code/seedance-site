import { put, list } from '@vercel/blob';

const PREFIX = 'seedgen-ledger-';

export async function readLedger() {
  try {
    const l = await list({ prefix: PREFIX });
    const blobs = (l && l.blobs) || [];
    if (!blobs.length) return { payments: {} };
    blobs.sort(function(a, b){ return new Date(b.uploadedAt) - new Date(a.uploadedAt); });
    const r = await fetch(blobs[0].url);
    if (!r.ok) return { payments: {} };
    const data = await r.json();
    if (!data || typeof data !== 'object' || !data.payments) return { payments: {} };
    return data;
  } catch (e) {
    return { payments: {} };
  }
}

export async function writeLedger(data) {
  try {
    return await put(PREFIX + Date.now() + '.json', JSON.stringify(data), { access: 'public' });
  } catch (e) {
    return null;
  }
}

export async function getBalance() {
  try {
    const key = process.env.COMETAPI_KEY;
    if (!key) return null;
    const r = await fetch('https://query.cometapi.com/user/quota?key=' + encodeURIComponent(key));
    if (!r.ok) return null;
    const d = await r.json();
    return (d && typeof d.total_quota === 'number') ? d.total_quota : null;
  } catch (e) {
    return null;
  }
}

export function estimateCost(service, seconds, quality) {
  const s = seconds || 5;
  if (service === 'text2video' || service === 'animate') {
    let c = s * (quality === '480p' ? 0.11 : 0.24);
    if (quality === '1080p') c += 0.16;
    return c;
  }
  if (service === 'cartoon' || service === 'toon') {
    let c = 0.1 + s * 0.24;
    if (quality === '1080p') c += 0.16;
    return c;
  }
  if (service === 'avatar' || service === 'motion' || service === 'lipsync') return 0.9;
  return 1.0;
}
