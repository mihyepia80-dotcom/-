const { setCors, readBody, checkAdminKey, getFirebaseAdmin, collectionPrefix } = require('../lib/api-utils');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const db = getFirebaseAdmin().firestore();
    const ref = db.collection(`${collectionPrefix()}_config`).doc('live');

    if (req.method === 'GET') {
      const snap = await ref.get();
      return res.status(200).json({ template: snap.exists ? snap.data() : null });
    }

    if (req.method === 'POST') {
      checkAdminKey(req);
      const body = await readBody(req);
      const template = body.template;
      if (!template) return res.status(400).json({ error: 'template required' });
      template.deployedAt = new Date().toISOString();
      await ref.set(template, { merge: true });
      return res.status(200).json({ ok: true, template });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
