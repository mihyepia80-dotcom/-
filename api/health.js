const { setCors } = require('../lib/api-utils');
const { hasServiceAccount } = require('../lib/load-env');

const CLIENT_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_PROJECT_ID',
];

const SERVER_KEYS = [
  'FIREBASE_SERVICE_ACCOUNT',
  'ADMIN_SYNC_KEY',
  'ADMIN_PASSWORD',
  'GEMINI_API_KEY',
];

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const firebase = hasServiceAccount();
  const clientOk = CLIENT_KEYS.every((k) => Boolean(process.env[k]?.trim()));
  const serverStatus = Object.fromEntries(
    SERVER_KEYS.map((k) => [k, Boolean(process.env[k]?.trim())])
  );

  let firebaseHint = '';
  if (!firebase) {
    firebaseHint = 'Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT 확인 후 재배포';
  } else if (!clientOk) {
    firebaseHint = 'Vercel 환경변수 FIREBASE_* (웹 설정) 확인 후 재배포';
  }

  return res.status(200).json({
    ok: firebase && clientOk,
    time: new Date().toISOString(),
    env: {
      firebase,
      clientFirebase: clientOk,
      firebaseHint,
      ...serverStatus,
    },
  });
};
