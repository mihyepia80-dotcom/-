#!/usr/bin/env node
/** Firebase 서비스 계정 JSON → Vercel용 Base64 한 줄 출력 */
const fs = require('fs');
const path = require('path');

const arg = process.argv[2];
const file = arg || path.join(__dirname, '..', 'firebase-service-account.json');

if (!fs.existsSync(file)) {
  console.error(`파일 없음: ${file}`);
  console.error('사용법: node scripts/encode-service-account.js [json경로]');
  process.exit(1);
}

const json = fs.readFileSync(file, 'utf8').trim();
JSON.parse(json);

const b64 = Buffer.from(json, 'utf8').toString('base64');
console.log('\nVercel Environment Variables 에 추가:\n');
console.log('이름: FIREBASE_SERVICE_ACCOUNT_BASE64');
console.log('값 (아래 한 줄 전체 복사):\n');
console.log(b64);
console.log('\n추가 후 Redeploy 하세요.\n');
