const { setCors, readBody } = require('../lib/api-utils');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await readBody(req);
    const expected = process.env.ADMIN_PASSWORD || '260026';
    const password = String(body?.password ?? '');

    if (password !== expected) {
      return res.status(401).json({ error: '관리자 암호가 올바르지 않습니다.' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
};
