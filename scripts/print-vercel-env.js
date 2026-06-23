#!/usr/bin/env node
/** Firebase 서비스 계정 JSON → Vercel 환경변수 복사용 출력 */
const fs = require('fs');
const path = require('path');

const arg = process.argv[2];
const file = arg || path.join(__dirname, '..', 'firebase-service-account.json');

if (!fs.existsSync(file)) {
  console.error(`\n파일 없음: ${file}`);
  console.error('Firebase Console → 서비스 계정 → 새 비공개 키 → JSON 저장 후:');
  console.error('  node scripts/print-vercel-env.js [json경로]\n');
  process.exit(1);
}

const cred = JSON.parse(fs.readFileSync(file, 'utf8'));
if (cred.type !== 'service_account') {
  console.error('service_account JSON이 아닙니다.');
  process.exit(1);
}

const privateKeyForVercel = cred.private_key.replace(/\n/g, '\\n');
const b64 = Buffer.from(JSON.stringify(cred), 'utf8').toString('base64');

console.log('\n=== Vercel → Settings → Environment Variables ===\n');
console.log('【방법 A — 권장】 변수 2개 추가:\n');
console.log('이름: FIREBASE_SA_CLIENT_EMAIL');
console.log('값:\n' + cred.client_email + '\n');
console.log('이름: FIREBASE_SA_PRIVATE_KEY');
console.log('값 (아래 전체 한 줄 복사):\n');
console.log(privateKeyForVercel);
console.log('\n【방법 B】 변수 1개 추가:\n');
console.log('이름: FIREBASE_SERVICE_ACCOUNT_BASE64');
console.log('값 (아래 한 줄):\n');
console.log(b64);
console.log('\n추가 후 Vercel → Deployments → Redeploy\n');
