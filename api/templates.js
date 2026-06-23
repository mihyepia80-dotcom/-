const admin = require('firebase-admin');

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  return admin;
}

function prefix() {
  return process.env.FIREBASE_COLLECTION_PREFIX || 'midterm2026';
}

function checkKey(req) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_SYNC_KEY) {
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
    const ref = db.collection(`${prefix()}_config`).doc('live');

    if (req.method === 'GET') {
      const snap = await ref.get();
      return res.status(200).json({ template: snap.exists ? snap.data() : null });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const template = body.template;
      if (!template) return res.status(400).json({ error: 'template required' });
      template.deployedAt = new Date().toISOString();
      await ref.set(template, { merge: true });
      return res.status(200).json({ ok: true, template });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
