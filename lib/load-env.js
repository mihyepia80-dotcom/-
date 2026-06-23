/** .env / .env.local 로드 + Firebase 서비스 계정 찾기 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let loaded = false;

function loadEnv() {
  if (loaded) return;
  loaded = true;
  ['.env', '.env.local'].forEach((file) => {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) return;
    fs.readFileSync(p, 'utf8')
      .split('\n')
      .forEach((line) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (!m) return;
        const key = m[1].trim();
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
  });
}

function findServiceAccountPath() {
  loadEnv();
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (envPath && fs.existsSync(envPath)) return path.resolve(envPath);

  const fixed = path.join(ROOT, 'firebase-service-account.json');
  if (fs.existsSync(fixed)) return fixed;

  try {
    const match = fs
      .readdirSync(ROOT)
      .find((f) => f.endsWith('.json') && f.includes('firebase-adminsdk'));
    if (match) return path.join(ROOT, match);
  } catch {
    /* ignore */
  }
  return null;
}

function loadServiceAccountCredential() {
  loadEnv();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT JSON 파싱 실패');
    }
  }
  const filePath = findServiceAccountPath();
  if (filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      throw new Error(`서비스 계정 파일 읽기 실패: ${path.basename(filePath)}`);
    }
  }
  return null;
}

function hasServiceAccount() {
  try {
    return Boolean(loadServiceAccountCredential());
  } catch {
    return false;
  }
}

module.exports = { loadEnv, findServiceAccountPath, loadServiceAccountCredential, hasServiceAccount };
