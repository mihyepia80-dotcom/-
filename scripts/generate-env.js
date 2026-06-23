/**
 * 클라이언트 env.js에 포함되는 키만 (GEMINI_API_KEY, ADMIN_PASSWORD는 서버 전용)
 */
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../lib/load-env');

loadEnv();

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
  const val = process.env[key]?.trim();
  if (val) env[key] = val;
});

const outPath = path.join(__dirname, '..', 'js', 'env.js');
const body = `/* 자동 생성 — Vercel 빌드 또는 node scripts/generate-env.js */
window.__ENV__ = ${JSON.stringify(env, null, 2)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body, 'utf8');

const configured = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_API_KEY);
console.log(configured ? '✓ js/env.js 생성 (Firebase 설정됨)' : '⚠ js/env.js 생성 (Vercel FIREBASE_* 또는 .env.local 확인)');
