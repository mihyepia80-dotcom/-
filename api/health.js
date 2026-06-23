const { setCors } = require('../lib/api-utils');
const { diagnoseServiceAccount } = require('../lib/load-env');

const CLIENT_KEYS = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];

const SERVER_KEYS = [
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_SERVICE_ACCOUNT_BASE64',
  'ADMIN_SYNC_KEY',
  'ADMIN_PASSWORD',
  'GEMINI_API_KEY',
];

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const sa = diagnoseServiceAccount();
  const clientOk = CLIENT_KEYS.every((k) => Boolean(process.env[k]?.trim()));
  const serverStatus = Object.fromEntries(
    SERVER_KEYS.map((k) => [k, Boolean(process.env[k]?.trim())])
  );

  let firebaseHint = '';
  if (!sa.ok) {
    if (sa.hasEnvVar) {
      firebaseHint = `FIREBASE_SERVICE_ACCOUNT 형식 오류: ${sa.error}`;
    } else {
      firebaseHint = 'Vercel에 FIREBASE_SERVICE_ACCOUNT (또는 _BASE64) 추가 후 재배포';
    }
  } else if (!clientOk) {
    firebaseHint = 'Vercel FIREBASE_* (웹 설정) 확인 후 재배포';
  }

  return res.status(200).json({
    ok: sa.ok && clientOk,
    time: new Date().toISOString(),
    env: {
      firebase: sa.ok,
      clientFirebase: clientOk,
      firebaseHint,
      firebaseError: sa.ok ? '' : sa.error,
      firebaseSource: sa.source || '',
      ...serverStatus,
    },
  });
};
