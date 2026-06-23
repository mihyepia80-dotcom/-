const { setCors, readBody, checkAdminKey, getFirebaseAdmin, collectionPrefix } = require('../lib/api-utils');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    checkAdminKey(req);
    const db = getFirebaseAdmin().firestore();
    const docRef = db.collection(`${collectionPrefix()}_master`).doc('sheet');

    if (req.method === 'GET') {
      const snap = await docRef.get();
      return res.status(200).json({ master: snap.exists ? snap.data() : null });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const master = body.master;
      if (!master?.rows) return res.status(400).json({ error: 'master.rows required' });
      master.updatedAt = new Date().toISOString();
      await docRef.set(master, { merge: true });
      return res.status(200).json({ ok: true, updatedAt: master.updatedAt });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
