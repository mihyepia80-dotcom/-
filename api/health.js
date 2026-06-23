const { setCors } = require('../lib/api-utils');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  return res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      firebase: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      adminKey: Boolean(process.env.ADMIN_SYNC_KEY),
    },
  });
};
