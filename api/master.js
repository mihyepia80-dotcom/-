/**
 * Vercel Serverless — 마스터 시트 Firestore 저장/불러오기
 * 환경변수: FIREBASE_* + FIREBASE_SERVICE_ACCOUNT (JSON 문자열) + ADMIN_SYNC_KEY
 */
const admin = require('firebase-admin');

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  const cred = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(cred) });
  return admin;
}

function prefix() {
  return process.env.FIREBASE_COLLECTION_PREFIX || 'midterm2026';
}

function checkKey(req) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SYNC_KEY) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    checkKey(req);
    const db = getAdmin().firestore();
    const docRef = db.collection(`${prefix()}_master`).doc('sheet');

    if (req.method === 'GET') {
      const snap = await docRef.get();
      return res.status(200).json({ master: snap.exists ? snap.data() : null });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const master = body.master;
      if (!master?.rows) return res.status(400).json({ error: 'master.rows required' });
      master.updatedAt = new Date().toISOString();
      await docRef.set(master, { merge: true });
      return res.status(200).json({ ok: true, updatedAt: master.updatedAt });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Server error' });
  }
};
