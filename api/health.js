const { setCors } = require('../lib/api-utils');
const { diagnoseServiceAccount } = require('../lib/load-env');

const CLIENT_KEYS = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];

const SERVER_KEYS = [
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_SERVICE_ACCOUNT_BASE64',
  'FIREBASE_SA_CLIENT_EMAIL',
  'FIREBASE_SA_PRIVATE_KEY',
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
      firebaseHint = `서비스 계정 형식 오류: ${sa.error}`;
    } else {
      firebaseHint =
        'Vercel에 서비스 계정 추가 필요 — FIREBASE_SA_CLIENT_EMAIL + FIREBASE_SA_PRIVATE_KEY (권장) 또는 _BASE64';
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
    setup: {
      methodA: 'FIREBASE_SA_CLIENT_EMAIL + FIREBASE_SA_PRIVATE_KEY (+ FIREBASE_PROJECT_ID)',
      methodB: 'FIREBASE_SERVICE_ACCOUNT_BASE64 (node scripts/encode-service-account.js)',
      methodC: 'FIREBASE_SERVICE_ACCOUNT (JSON 한 줄)',
      afterAdd: 'Vercel Deployments → Redeploy 필수',
    },
  });
};
