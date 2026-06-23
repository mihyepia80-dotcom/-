/**
 * 관리자 암호 확인 (서버 전용 — 클라이언트에 암호 미노출)
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ADMIN_PASSWORD || '260026';
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const password = String(body?.password ?? '');

  if (password !== expected) {
    return res.status(401).json({ error: '관리자 암호가 올바르지 않습니다.' });
  }

  const token = Buffer.from(`${Date.now()}:${expected}`).toString('base64');
  return res.status(200).json({ ok: true, token });
};
