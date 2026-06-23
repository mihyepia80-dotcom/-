const CloudStore = (() => {
  let db = null;
  let auth = null;
  let ready = false;
  let initPromise = null;
  let prefix = 'midterm2026';

  function env() {
    return window.__ENV__ || {};
  }

  function isConfigured() {
    const e = env();
    return Boolean(e.FIREBASE_PROJECT_ID && e.FIREBASE_API_KEY);
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

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!isConfigured()) {
        ready = false;
        return false;
      }
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded');
        ready = false;
        return false;
      }
      const e = env();
      prefix = e.FIREBASE_COLLECTION_PREFIX || 'midterm2026';
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
      if (!auth.currentUser) {
        await auth.signInAnonymously();
      }
      ready = true;
      return true;
    })();
    return initPromise;
  }

  function assertReady() {
    if (!ready || !db) throw new Error('Firebase가 설정되지 않았습니다. .env를 채운 뒤 npm run build 하세요.');
  }

  /** 담당자 제출물 저장 (동일 formType+formKey+personName 은 덮어쓰기) */
  async function submit({ formType, formKey, personName, label, data }) {
    await init();
    assertReady();
    const uid = auth.currentUser.uid;
    const docId = `${formType}__${formKey}__${slug(personName)}`;
    const payload = {
      formType,
      formKey,
      personName: personName || '',
      label: label || `${formType} · ${personName}`,
      data,
      submittedBy: uid,
      updatedAt: new Date().toISOString(),
    };
    await db.collection(collection('submissions')).doc(docId).set(payload, { merge: true });
    return docId;
  }

  /** 제출물 목록 (관리자용) */
  async function listSubmissions(formType = null) {
    await init();
    assertReady();
    let query = db.collection(collection('submissions')).orderBy('updatedAt', 'desc');
    if (formType) query = query.where('formType', '==', formType);
    const snap = await query.limit(200).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /** 행사 평가 제출물 → 마스터 행 병합 (goodPoints / improvePoints) */
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

  /** 마스터 시트 API 경유 저장 (ADMIN_SYNC_KEY 필요) */
  async function saveMasterViaApi(masterData) {
    const key = env().ADMIN_SYNC_KEY;
    if (!key) throw new Error('ADMIN_SYNC_KEY가 설정되지 않았습니다.');
    const res = await fetch('/api/master', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': key,
      },
      body: JSON.stringify({ master: masterData }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `마스터 저장 실패 (${res.status})`);
    }
    return res.json();
  }

  /** 마스터 시트 API 경유 불러오기 */
  async function loadMasterViaApi() {
    const key = env().ADMIN_SYNC_KEY;
    if (!key) throw new Error('ADMIN_SYNC_KEY가 설정되지 않았습니다.');
    const res = await fetch('/api/master', {
      headers: { 'X-Admin-Key': key },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `마스터 불러오기 실패 (${res.status})`);
    }
    return res.json();
  }

  /** Firestore 직접 읽기 (읽기 전용 미리보기) */
  async function loadMasterPreview() {
    await init();
    assertReady();
    const doc = await db.collection(collection('master')).doc('sheet').get();
    return doc.exists ? doc.data() : null;
  }

  return {
    init,
    isConfigured,
    submit,
    listSubmissions,
    mergeEventEvalIntoMaster,
    saveMasterViaApi,
    loadMasterViaApi,
    loadMasterPreview,
    collection,
  };
})();
