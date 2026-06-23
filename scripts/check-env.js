const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  /* optional */
}

const REQUIRED_CLIENT = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const REQUIRED_VERCEL = ['ADMIN_SYNC_KEY', 'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_COLLECTION_PREFIX'];

function check(keys, label) {
  const missing = keys.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    console.log(`\n[${label}] 누락: ${missing.join(', ')}`);
    return false;
  }
  console.log(`[${label}] OK`);
  return true;
}

console.log('환경변수 점검\n');
const clientOk = check(REQUIRED_CLIENT, 'Firebase 클라이언트');
const vercelOk = check(REQUIRED_VERCEL, 'Vercel API (배포용)');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('[FIREBASE_SERVICE_ACCOUNT] JSON 형식 OK');
  } catch {
    console.log('[FIREBASE_SERVICE_ACCOUNT] JSON 파싱 실패 — 한 줄 문자열인지 확인');
  }
}

const envJs = path.join(__dirname, '..', 'js', 'env.js');
if (fs.existsSync(envJs)) {
  console.log('[js/env.js] 존재함');
} else {
  console.log('[js/env.js] 없음 — npm run build 실행');
}

process.exit(clientOk ? 0 : 1);
