const CloudStore = (() => {
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

  function adminKey() {
    return env().ADMIN_SYNC_KEY || '';
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
      prefix = env().FIREBASE_COLLECTION_PREFIX || 'midterm2026';
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          ready = false;
          return false;
        }
        const health = await res.json();
        if (!health.env?.firebase) {
          ready = false;
          return false;
        }
        ready = true;
        return true;
      } catch {
        ready = false;
        return false;
      }
    })();
    return initPromise;
  }

  function assertReady() {
    if (!ready) {
      throw new Error(
        '클라우드 서버에 연결할 수 없습니다. npm run dev 로 실행하고 FIREBASE_SERVICE_ACCOUNT를 설정하세요.'
      );
    }
  }

  async function parseError(res) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `요청 실패 (${res.status})`);
  }

  /** 담당자 제출물 저장 (동일 formType+formKey+personName 은 덮어쓰기) */
  async function submit({ formType, formKey, personName, label, data }) {
    await init();
    assertReady();
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formType, formKey, personName, label, data }),
    });
    if (!res.ok) await parseError(res);
    const result = await res.json();
    return result.id;
  }

  /** 제출물 목록 (관리자용) */
  async function listSubmissions(formType = null) {
    await init();
    assertReady();
    const params = new URLSearchParams({ list: '1' });
    if (formType) params.set('formType', formType);
    const res = await fetch(`/api/submissions?${params}`, {
      headers: { 'X-Admin-Key': adminKey() },
    });
    if (!res.ok) await parseError(res);
    const data = await res.json();
    return data.items || [];
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
    const key = adminKey();
    if (!key) throw new Error('ADMIN_SYNC_KEY가 설정되지 않았습니다.');
    const res = await fetch('/api/master', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': key,
      },
      body: JSON.stringify({ master: masterData }),
    });
    if (!res.ok) await parseError(res);
    return res.json();
  }

  /** 마스터 시트 API 경유 불러오기 */
  async function loadMasterViaApi() {
    const key = adminKey();
    if (!key) throw new Error('ADMIN_SYNC_KEY가 설정되지 않았습니다.');
    const res = await fetch('/api/master', {
      headers: { 'X-Admin-Key': key },
    });
    if (!res.ok) await parseError(res);
    return res.json();
  }

  /** 제출물 1건 조회 (작성자 불러오기) */
  async function fetchSubmission(formType, formKey, personName) {
    await init();
    assertReady();
    const params = new URLSearchParams({ formType, formKey, personName });
    const res = await fetch(`/api/submissions?${params}`);
    if (!res.ok) await parseError(res);
    const data = await res.json();
    return data.item || null;
  }

  return {
    init,
    isConfigured,
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
