const {
  setCors,
  readBody,
  checkAdminKey,
  getFirebaseAdmin,
  collectionPrefix,
  slug,
  getQuery,
} = require('../lib/api-utils');

function docId(formType, formKey, personName) {
  return `${formType}__${formKey}__${slug(personName)}`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const q = getQuery(req);
    const db = getFirebaseAdmin().firestore();
    const col = db.collection(`${collectionPrefix()}_submissions`);

    if (req.method === 'GET') {
      if (q.list === '1') {
        checkAdminKey(req);
        let query = col.orderBy('updatedAt', 'desc');
        if (q.formType) query = query.where('formType', '==', q.formType);
        const snap = await query.limit(200).get();
        return res.status(200).json({
          items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      }

      const { formType, formKey, personName } = q;
      if (!formType || !formKey || !personName) {
        return res.status(400).json({ error: 'formType, formKey, personName required' });
      }
      const snap = await col.doc(docId(formType, formKey, personName)).get();
      return res.status(200).json({
        item: snap.exists ? { id: snap.id, ...snap.data() } : null,
      });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const { formType, formKey, personName, label, data } = body;
      if (!formType || !formKey || !personName) {
        return res.status(400).json({ error: 'formType, formKey, personName required' });
      }
      const id = docId(formType, formKey, personName);
      const payload = {
        formType,
        formKey,
        personName: String(personName).trim(),
        label: label || `${formType} · ${personName}`,
        data,
        updatedAt: new Date().toISOString(),
      };
      await col.doc(id).set(payload, { merge: true });
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
