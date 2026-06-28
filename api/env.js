const { setCors } = require('../lib/api-utils');
const { loadEnv, readServiceAccountFromSplitEnv, readServiceAccountFromEnv } = require('../lib/load-env');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  loadEnv();

  const env = {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
    FIREBASE_COLLECTION_PREFIX: process.env.FIREBASE_COLLECTION_PREFIX || '',
    ADMIN_SYNC_KEY: process.env.ADMIN_SYNC_KEY || '',
  };

  return res.status(200).json(env);
};