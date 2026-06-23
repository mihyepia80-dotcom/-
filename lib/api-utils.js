/** API 공통 유틸 (Vercel Serverless + 로컬 dev-server) */

function setCors(res, extra = '') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    `Content-Type, X-Admin-Key${extra ? `, ${extra}` : ''}`
  );
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function checkAdminKey(req) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SYNC_KEY) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
}

function getFirebaseAdmin() {
  const admin = require('firebase-admin');
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  let cred;
  try {
    cred = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON parse failed');
  }
  admin.initializeApp({ credential: admin.credential.cert(cred) });
  return admin;
}

function collectionPrefix() {
  return process.env.FIREBASE_COLLECTION_PREFIX || 'midterm2026';
}

function slug(str) {
  return String(str ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w가-힣_-]/g, '')
    .slice(0, 48) || 'anonymous';
}

function getQuery(req) {
  if (req.query && typeof req.query === 'object' && !Array.isArray(req.query)) {
    return req.query;
  }
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return Object.fromEntries(url.searchParams);
  } catch {
    return {};
  }
}

module.exports = { setCors, readBody, checkAdminKey, getFirebaseAdmin, collectionPrefix, slug, getQuery };
