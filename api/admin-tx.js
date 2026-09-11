import { readLedger, getBalance } from '../lib/ledger.js';

export default async function handler(req, res) {
  const pw = req.query.adminPassword || (req.body && req.body.adminPassword);
  if (!process.env.ADMIN_SECRET || pw !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  const ledger = await readLedger();
  const bal = await getBalance();
  return res.json({ balance: bal, ledger: ledger });
}
