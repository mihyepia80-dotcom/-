#!/usr/bin/env node
/** 클라oud 연결에 필요한 설정 점검 */
const { loadEnv, hasServiceAccount, findServiceAccountPath } = require('../lib/load-env');
const fs = require('fs');
const path = require('path');

loadEnv();

const clientKeys = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

console.log('\n클라oud 설정 점검\n');

const missingClient = clientKeys.filter((k) => !process.env[k]?.trim());
if (missingClient.length) {
  console.log('❌ Firebase 웹 설정 (.env.local):', missingClient.join(', '));
  console.log('   → Firebase Console → 프로젝트 설정 → 일반 → 내 앱 에서 복사\n');
} else {
  console.log('✓ Firebase 웹 설정 OK\n');
}

if (hasServiceAccount()) {
  const p = findServiceAccountPath();
  console.log(p ? `✓ 서비스 계정: ${path.basename(p)}` : '✓ 서비스 계정: FIREBASE_SERVICE_ACCOUNT 환경변수');
} else {
  console.log('❌ 서비스 계정 없음');
  console.log('   → Firebase Console → 서비스 계정 → 새 비공개 키');
  console.log('   → firebase-service-account.json 으로 프로젝트 루트에 저장\n');
}

const envJs = path.join(__dirname, '..', 'js', 'env.js');
if (fs.existsSync(envJs)) {
  const content = fs.readFileSync(envJs, 'utf8');
  if (content.includes('FIREBASE_PROJECT_ID')) console.log('✓ js/env.js 생성됨');
  else console.log('⚠ js/env.js 비어 있음 — node scripts/generate-env.js 실행');
} else {
  console.log('⚠ js/env.js 없음 — node scripts/generate-env.js 실행');
}

console.log('\n로컬 실행: node scripts/generate-env.js && node scripts/dev-server.js');
console.log('\nVercel 배포: Settings → Environment Variables 에서 아래 변수 설정 후 재배포\n');
