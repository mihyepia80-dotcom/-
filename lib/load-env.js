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

/** Vercel 등에서 흔한 형식(한 줄 JSON, Base64, 이중 인코딩) 지원 */
function parseServiceAccountJson(raw) {
  let s = String(raw ?? '').trim();
  if (!s) throw new Error('empty');

  for (let i = 0; i < 2; i++) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
  }

  const tryParse = (text) => {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') return JSON.parse(parsed);
    return parsed;
  };

  try {
    return tryParse(s);
  } catch {
    /* continue */
  }

  if (!s.startsWith('{')) {
    try {
      return tryParse(Buffer.from(s, 'base64').toString('utf8'));
    } catch {
      /* continue */
    }
  }

  throw new Error('JSON parse failed');
}

function readServiceAccountFromEnv() {
  loadEnv();
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (b64) return parseServiceAccountJson(b64);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) return parseServiceAccountJson(raw);

  return null;
}

function loadServiceAccountCredential() {
  const fromEnv = readServiceAccountFromEnv();
  if (fromEnv) {
    if (fromEnv.type !== 'service_account' || !fromEnv.private_key || !fromEnv.client_email) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT 형식 오류 (service_account JSON 확인)');
    }
    return fromEnv;
  }

  const filePath = findServiceAccountPath();
  if (filePath) {
    try {
      const cred = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (cred.type !== 'service_account') throw new Error('not service_account');
      return cred;
    } catch {
      throw new Error(`서비스 계정 파일 읽기 실패: ${path.basename(filePath)}`);
    }
  }
  return null;
}

function diagnoseServiceAccount() {
  loadEnv();
  const hasRaw = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim());
  const hasB64 = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim());
  const filePath = findServiceAccountPath();

  try {
    const cred = loadServiceAccountCredential();
    if (cred) {
      return {
        ok: true,
        source: hasB64 ? 'FIREBASE_SERVICE_ACCOUNT_BASE64' : hasRaw ? 'FIREBASE_SERVICE_ACCOUNT' : 'file',
      };
    }
    return {
      ok: false,
      hasEnvVar: hasRaw || hasB64,
      error: 'FIREBASE_SERVICE_ACCOUNT 또는 FIREBASE_SERVICE_ACCOUNT_BASE64 미설정',
    };
  } catch (e) {
    return {
      ok: false,
      hasEnvVar: hasRaw || hasB64 || Boolean(filePath),
      error: e.message || '서비스 계정 로드 실패',
    };
  }
}

function hasServiceAccount() {
  return diagnoseServiceAccount().ok;
}

module.exports = {
  loadEnv,
  findServiceAccountPath,
  parseServiceAccountJson,
  loadServiceAccountCredential,
  diagnoseServiceAccount,
  hasServiceAccount,
};
