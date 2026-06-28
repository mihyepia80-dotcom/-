const CloudStore = (() => {
  let ready = false;
  let initPromise = null;
  let mode = null;
  let lastError = '';
  let db = null;
  let auth = null;
  let prefix = 'midterm2026';

  function env() {
    return window.__ENV__ || {};
  }

  function isConfigured() {
    const e = env();
    return Boolean(e.FIREBASE_PROJECT_ID && e.FIREBASE_API_KEY);
  }

  function adminKey() {
    return env().ADMIN_SYNC_KEY || '';
  }

  async function loadClientEnv() {
    if (isConfigured()) return;
    if (typeof fetch !== 'function') return;
    try {
      const res = await fetch('/api/env', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object') {
        window.__ENV__ = Object.assign(window.__ENV__ || {}, data);
      }
    } catch {
      // ignore runtime env load failures
    }
  }

  function getMode() {
    return mode;
  }

  function getLastError() {
    return lastError;
  }

  function collection(name) {
    return `${prefix}_${name}`;
  }

  function slug(str) {
    return String(str ?? '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w가-힣_-]/g, '')
      .slice(0, 48) || 'anonymous';
  }

  function initFirebaseApp() {
    const e = env();
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: e.FIREBASE_API_KEY,
        authDomain: e.FIREBASE_AUTH_DOMAIN,
        projectId: e.FIREBASE_PROJECT_ID,
        storageBucket: e.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: e.FIREBASE_MESSAGING_SENDER_ID,
        appId: e.FIREBASE_APP_ID,
      });
    }
    auth = firebase.auth();
    db = firebase.firestore();
  }

  async function initClient() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK 미로드');
    }
    initFirebaseApp();
    if (!auth.currentUser) {
      await auth.signInAnonymously();
    }
    mode = 'client';
    ready = true;
    return true;
  }

  async function initApi() {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const health = await res.json();
    if (!health.env?.firebase) return false;
    mode = 'api';
    ready = true;
    return true;
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      lastError = '';
      ready = false;
      mode = null;
      await loadClientEnv();
      if (!isConfigured()) {
        lastError = 'Firebase 웹 설정 없음';
        return false;
      }
      prefix = env().FIREBASE_COLLECTION_PREFIX || 'midterm2026';
      try {
        if (await initApi()) return true;
      } catch {
        /* API fallback */
      }
      try {
        return await initClient();
      } catch (e) {
        lastError = e.message || String(e);
        if (/admin-restricted|operation-not-allowed/i.test(lastError)) {
          lastError = 'Firebase Console → Authentication → 익명 로그인 활성화 필요';
        }
        ready = false;
        mode = null;
        return false;
      }
    })();
    return initPromise;
  }

  function assertReady() {
    if (!ready) {
      throw new Error(lastError || '클라우드에 연결되지 않았습니다.');
    }
  }

  async function parseError(res) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `요청 실패 (${res.status})`);
  }

  function submissionPayload({ formType, formKey, personName, label, data }) {
    const uid = mode === 'client' ? auth.currentUser.uid : 'api';
    return {
      formType,
      formKey,
      personName: personName || '',
      label: label || `${formType} · ${personName}`,
      data,
      submittedBy: uid,
      updatedAt: new Date().toISOString(),
    };
  }

  async function submit({ formType, formKey, personName, label, data }) {
    await init();
    assertReady();
    const docId = `${formType}__${formKey}__${slug(personName)}`;
    const payload = submissionPayload({ formType, formKey, personName, label, data });

    if (mode === 'api') {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType, formKey, personName, label, data }),
      });
      if (!res.ok) await parseError(res);
      const result = await res.json();
      return result.id;
    }

    await db.collection(collection('submissions')).doc(docId).set(payload, { merge: true });
    return docId;
  }

  async function listSubmissions(formType = null) {
    await init();
    assertReady();

    if (mode === 'api') {
      const params = new URLSearchParams({ list: '1' });
      if (formType) params.set('formType', formType);
      const res = await fetch(`/api/submissions?${params}`, {
        headers: { 'X-Admin-Key': adminKey() },
      });
      if (!res.ok) await parseError(res);
      const data = await res.json();
      return data.items || [];
    }

    let query = db.collection(collection('submissions')).orderBy('updatedAt', 'desc');
    if (formType) query = query.where('formType', '==', formType);
    const snap = await query.limit(200).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  function mergeEventEvalIntoMaster(masterData, submissions) {
    const data = JSON.parse(JSON.stringify(masterData));
    const rowMap = new Map(data.rows.map((r) => [r.id, r]));
    submissions.forEach((sub) => {
      if (sub.formType !== 'event-eval') return;
      const rows = sub.data?.rows || [];
      rows.forEach((patch) => {
        const row = rowMap.get(patch.id);
        if (!row) return;
        if (patch.goodPoints?.trim()) row.goodPoints = patch.goodPoints;
        if (patch.improvePoints?.trim()) row.improvePoints = patch.improvePoints;
      });
    });
    data.rows = [...rowMap.values()];
    data.mergedAt = new Date().toISOString();
    return data;
  }

  async function saveMasterViaApi(masterData) {
    const key = adminKey();
    if (!key) throw new Error('ADMIN_SYNC_KEY가 설정되지 않았습니다.');
    const res = await fetch('/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
      body: JSON.stringify({ master: masterData }),
    });
    if (!res.ok) await parseError(res);
    return res.json();
  }

  async function loadMasterViaApi() {
    const key = adminKey();
    if (!key) throw new Error('ADMIN_SYNC_KEY가 설정되지 않았습니다.');
    const res = await fetch('/api/master', { headers: { 'X-Admin-Key': key } });
    if (!res.ok) await parseError(res);
    return res.json();
  }

  async function fetchSubmission(formType, formKey, personName) {
    await init();
    assertReady();
    const docId = `${formType}__${formKey}__${slug(personName)}`;

    if (mode === 'api') {
      const params = new URLSearchParams({ formType, formKey, personName });
      const res = await fetch(`/api/submissions?${params}`);
      if (!res.ok) await parseError(res);
      const data = await res.json();
      return data.item || null;
    }

    const snap = await db.collection(collection('submissions')).doc(docId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  return {
    init,
    isConfigured,
    getMode,
    getLastError,
    submit,
    fetchSubmission,
    listSubmissions,
    mergeEventEvalIntoMaster,
    saveMasterViaApi,
    loadMasterViaApi,
    collection,
    slug,
  };
})();
