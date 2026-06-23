const TemplateStore = (() => {
  const CACHE_KEY = 'midterm-live-template';
  let live = null;

  function defaultTemplate() {
    return {
      version: 1,
      deployedAt: null,
      formGrade: {
        enabled: ['fg1', 'fg2', 'fg3', 'fg4', 'fg5', 'fg6'],
        pinned: ['fg1', 'fg2', 'fg3', 'fg4', 'fg5', 'fg6'],
        grades: Object.fromEntries(
          [1, 2, 3, 4, 5, 6].map((n) => [
            `fg${n}`,
            {
              title: `${n}학년`,
              mainMonths: ['3월', '4월', '5월', '6월', '7월'],
              attachCount: 5,
              sectionTitles: {
                main: '교육활동 평가',
                attach: '학년별 협의록 첨부 양식',
              },
            },
          ])
        ),
      },
      form4: { defaultAttachCount: 8, categories: ['본인', '주관', '행사', '업무'] },
      form6: { showAllDepts: true },
    };
  }

  function getLive() {
    if (live) return live;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      live = raw ? JSON.parse(raw) : defaultTemplate();
    } catch {
      live = defaultTemplate();
    }
    return live;
  }

  function setLive(tpl) {
    live = tpl;
    localStorage.setItem(CACHE_KEY, JSON.stringify(tpl));
    document.dispatchEvent(new CustomEvent('template-updated', { detail: tpl }));
  }

  async function fetchFromCloud() {
    if (!CloudStore.isConfigured()) return getLive();
    await CloudStore.init();
    const db = firebase.firestore();
    const prefix = (window.__ENV__?.FIREBASE_COLLECTION_PREFIX || 'midterm2026');
    const doc = await db.collection(`${prefix}_config`).doc('live').get();
    if (doc.exists) {
      setLive(doc.data());
      return doc.data();
    }
    return getLive();
  }

  async function deployViaApi(template) {
    const key = window.__ENV__?.ADMIN_SYNC_KEY;
    if (!key) throw new Error('ADMIN_SYNC_KEY 필요');
    template.version = (template.version || 0) + 1;
    template.deployedAt = new Date().toISOString();
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
      body: JSON.stringify({ template }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '배포 실패');
    }
    const data = await res.json();
    setLive(data.template);
    return data.template;
  }

  function applyGradeTemplate(prefix) {
    const tpl = getLive();
    const g = tpl.formGrade?.grades?.[prefix];
    if (!g) return;
    const titleEl = document.querySelector(`#panel-${prefix} .grade-title`);
    if (titleEl && g.title) titleEl.textContent = `2026학년도 1학기 교육활동 평가 협의록 — ${g.title}`;
    const mainTitle = document.querySelector(`#panel-${prefix} .section-title:not(.attach-title)`);
    if (mainTitle && g.sectionTitles?.main) mainTitle.textContent = g.sectionTitles.main;
    const attachTitle = document.querySelector(`#panel-${prefix} .attach-title`);
    if (attachTitle && g.sectionTitles?.attach) attachTitle.textContent = g.sectionTitles.attach;
  }

  function applyPinnedTabs() {
    const tpl = getLive();
    const nav = document.getElementById('grade-subtabs');
    if (!nav || !tpl.formGrade?.pinned) return;
    nav.querySelectorAll('.sub-tab-btn').forEach((btn) => {
      const target = btn.dataset.target?.replace('panel-', '') || '';
      const enabled = tpl.formGrade.enabled?.includes(target) !== false;
      const pinned = tpl.formGrade.pinned?.includes(target);
      btn.hidden = !enabled;
      if (pinned) btn.classList.add('tab-pinned');
    });
  }

  function getDefaultMainRows(prefix) {
    const tpl = getLive();
    const months = tpl.formGrade?.grades?.[prefix]?.mainMonths || ['3월', '4월', '5월', '6월', '7월'];
    return months.map((month) => ({
      month,
      grade: '',
      content: '',
      satisfaction: '',
      goodPoints: '',
      improvePoints: '',
    }));
  }

  function getDefaultAttachCount(prefix) {
    return getLive().formGrade?.grades?.[prefix]?.attachCount ?? 5;
  }

  return {
    defaultTemplate,
    getLive,
    setLive,
    fetchFromCloud,
    deployViaApi,
    applyGradeTemplate,
    applyPinnedTabs,
    getDefaultMainRows,
    getDefaultAttachCount,
  };
})();
