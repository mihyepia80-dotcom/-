/**
 * 클라이언트 env.js에 포함되는 키만 (GEMINI_API_KEY, ADMIN_PASSWORD는 서버 전용)
 */
const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch {
  /* dotenv optional when env vars already injected (Vercel) */
}

const KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_COLLECTION_PREFIX',
  'ADMIN_SYNC_KEY',
];

const env = {};
KEYS.forEach((key) => {
  if (process.env[key]) env[key] = process.env[key];
});

const outPath = path.join(__dirname, '..', 'js', 'env.js');
const body = `/* 자동 생성 — npm run build | .env 값은 Git에 포함되지 않음 */
window.__ENV__ = ${JSON.stringify(env, null, 2)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body, 'utf8');

const configured = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_API_KEY);
console.log(configured ? '✓ js/env.js 생성 (Firebase 설정됨)' : '⚠ js/env.js 생성 (Firebase 미설정 — .env.example 참고)');
