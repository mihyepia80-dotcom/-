const AdminDashboard = (() => {
  const SESSION = 'admin-session';
  let submissions = [];
  let editTemplate = null;

  function adminKey() {
    return window.__ENV__?.ADMIN_SYNC_KEY || '';
  }

  function saveSession(data) {
    sessionStorage.setItem(SESSION, JSON.stringify(data));
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION) || 'null');
    } catch {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION);
  }

  async function verifyPassword(password) {
    try {
      const res = await fetch('/api/admin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) return res.json();
      if (res.status === 401) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '관리자 암호가 올바르지 않습니다.');
      }
    } catch (e) {
      if (e.message && !/failed|network|fetch|404/i.test(e.message)) throw e;
    }
    const expected = window.__ENV__?.ADMIN_PASSWORD || '260026';
    if (password === expected) return { ok: true };
    throw new Error('관리자 암호가 올바르지 않습니다.');
  }

  function showGate(msg = '') {
    const gate = document.getElementById('admin-gate');
    const app = document.getElementById('admin-app');
    gate.hidden = false;
    gate.style.display = '';
    app.hidden = true;
    app.style.display = 'none';
    const msgEl = document.getElementById('gate-msg');
    if (msgEl) msgEl.textContent = msg;
  }

  function showApp(session) {
    const gate = document.getElementById('admin-gate');
    const app = document.getElementById('admin-app');
    gate.hidden = true;
    gate.style.display = 'none';
    app.hidden = false;
    app.style.display = '';
    document.getElementById('admin-user-info').textContent =
      `관리자 · 로그인 ${new Date(session.at).toLocaleString('ko-KR')}`;
    initPanels();
  }

  async function tryRestoreSession() {
    const s = getSession();
    if (s?.passwordOk) showApp(s);
    else showGate();
  }

  function bindGate() {
    const pwBtn = document.getElementById('admin-pw-btn');
    const msg = document.getElementById('gate-msg');

    async function doLogin() {
      const password = document.getElementById('admin-password').value;
      msg.textContent = '확인 중…';
      try {
        await verifyPassword(password);
        const session = { passwordOk: true, at: Date.now() };
        saveSession(session);
        showApp(session);
      } catch (e) {
        msg.textContent = e.message;
        msg.dataset.state = 'err';
      }
    }

    pwBtn.addEventListener('click', doLogin);

    document.getElementById('admin-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });

    document.getElementById('admin-logout')?.addEventListener('click', () => {
      clearSession();
      showGate('로그아웃되었습니다.');
    });
  }

  function bindNav() {
    document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-btn').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.admin-panel').forEach((p) => {
          p.hidden = p.id !== btn.dataset.panel;
          p.classList.toggle('active', p.id === btn.dataset.panel);
        });
      });
    });
  }

  function initEventFilters() {
    const monthSel = document.getElementById('evt-month');
    const gradeSel = document.getElementById('evt-grade');
    if (!monthSel) return;
    [...MasterSheet.SEMESTER1_MONTHS, ...MasterSheet.SEMESTER2_MONTHS].forEach((m) => {
      monthSel.innerHTML += `<option value="${m}">${m}</option>`;
    });
    [1, 2, 3, 4, 5, 6].forEach((g) => {
      gradeSel.innerHTML += `<option value="${g}학년">${g}학년</option>`;
    });
  }

  async function loadSubmissions() {
    await CloudStore.init();
    submissions = await CloudStore.listSubmissions();
    showAggregate('form-grade');
  }

  function itemsByType(formType) {
    return submissions.filter((s) => s.formType === formType);
  }

  function showAggregate(formType) {
    document.querySelectorAll('.admin-subnav .btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.stype === formType);
    });
    const items = itemsByType(formType);
    const listEl = document.getElementById('aggregate-list');
    const detailEl = document.getElementById('aggregate-detail');

    if (!items.length) {
      listEl.innerHTML = '<p class="cloud-empty">제출물 없음</p>';
      detailEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = `
      <p class="aggregate-summary"><strong>${items.length}건</strong> 제출 · 아래 통합 보기</p>
      <ul class="aggregate-names">${items
        .map((i) => `<li>${esc(i.personName)} — ${esc(i.updatedAt?.slice(0, 16).replace('T', ' '))}</li>`)
        .join('')}</ul>`;

    detailEl.innerHTML = `<div class="aggregate-merged">${renderMerged(formType, items)}</div>`;
  }

  function renderMerged(formType, items) {
    if (formType === 'form-grade') {
      return items
        .map((item) => {
          const d = item.data || {};
          const main = (d.mainRows || [])
            .map(
              (r) =>
                `<tr><td>${esc(r.month)}</td><td>${esc(r.grade)}</td><td>${esc(r.content)}</td><td>${esc(r.satisfaction)}</td><td>${esc(r.goodPoints)}</td><td>${esc(r.improvePoints)}</td></tr>`
            )
            .join('');
          return `<section class="merged-block"><h3>${esc(item.label)} · ${esc(item.personName)}</h3>
            <table class="eval-table"><thead><tr><th>월</th><th>학년</th><th>내용</th><th>만족도</th><th>좋았던점</th><th>보완점</th></tr></thead><tbody>${main}</tbody></table></section>`;
        })
        .join('');
    }
    if (formType === 'form4') {
      return items
        .map((item) => {
          const d = item.data || {};
          const rows = (d.mainRows || [])
            .map(
              (r) =>
                `<tr><td>${esc(r.category)}</td><td>${esc(r.target)}</td><td>${esc(r.program)}</td><td>${esc(r.satisfaction)}</td><td>${esc(r.reason)}</td></tr>`
            )
            .join('');
          return `<section class="merged-block"><h3>${esc(d.name || item.label)} · ${esc(item.personName)}</h3>
            <table class="eval-table"><thead><tr><th>구분</th><th>대상</th><th>프로그램</th><th>만족도</th><th>평가</th></tr></thead><tbody>${rows}</tbody></table></section>`;
        })
        .join('');
    }
    if (formType === 'form5') {
      return items
        .map((item) => {
          const d = item.data || {};
          const rows = (d.rows || [])
            .map(
              (r) =>
                `<tr><td>${esc(r.month)}</td><td>${esc(r.grade)}</td><td>${esc(r.activity)}</td><td>${esc(r.dept)}</td><td>${esc(r.goodPoints)}</td><td>${esc(r.improvePoints)}</td></tr>`
            )
            .join('');
          return `<section class="merged-block"><h3>${esc(item.label)} · ${esc(item.personName)} (${esc(d.semester || item.formKey || '')})</h3>
            <table class="eval-table"><thead><tr><th>월</th><th>학년</th><th>행사</th><th>부서</th><th>좋았던점</th><th>보완점</th></tr></thead><tbody>${rows}</tbody></table></section>`;
        })
        .join('');
    }
    if (formType === 'form6') {
      return items
        .map((item) => {
          const store = item.data?.store || item.data || {};
          const blocks = Object.entries(store.rowData || {})
            .map(([key, val]) => {
              const tasks = (val.tasks || []).map((t) => esc(t.content)).join('<hr>');
              return `<div class="merged-task"><small>${esc(key)}</small><div>${tasks}</div></div>`;
            })
            .join('');
          return `<section class="merged-block"><h3>${esc(item.personName)}</h3>${blocks}</section>`;
        })
        .join('');
    }
    return items.map((i) => `<pre>${esc(JSON.stringify(i.data, null, 2))}</pre>`).join('');
  }

  function searchEvents() {
    const rows = MasterView.searchEvents({
      keyword: document.getElementById('evt-kw').value,
      month: document.getElementById('evt-month').value,
      grade: document.getElementById('evt-grade').value,
      semester: document.getElementById('evt-semester').value,
    });
    document.getElementById('event-results').innerHTML = MasterView.renderTableHtml(rows);
  }

  function renderTemplateEditor() {
    editTemplate = JSON.parse(JSON.stringify(TemplateStore.getLive()));
    const grades = editTemplate.formGrade.grades;
    const el = document.getElementById('template-editor');
    el.innerHTML = [1, 2, 3, 4, 5, 6]
      .map((n) => {
        const prefix = `fg${n}`;
        const g = grades[prefix];
        const pinned = editTemplate.formGrade.pinned.includes(prefix);
        const enabled = editTemplate.formGrade.enabled.includes(prefix);
        return `
        <div class="template-grade-card" data-prefix="${prefix}">
          <label><input type="checkbox" class="tpl-enabled" ${enabled ? 'checked' : ''} /> ${n}학년 탭 사용</label>
          <label><input type="checkbox" class="tpl-pinned" ${pinned ? 'checked' : ''} /> 탭 고정</label>
          <label>표시 제목 <input type="text" class="tpl-title" value="${esc(g.title)}" /></label>
          <label>교육활동 평가 제목 <input type="text" class="tpl-main-title" value="${esc(g.sectionTitles?.main || '')}" /></label>
          <label>첨부 양식 제목 <input type="text" class="tpl-attach-title" value="${esc(g.sectionTitles?.attach || '')}" /></label>
          <label>첨부 행 수 <input type="number" class="tpl-attach-count" min="1" max="20" value="${g.attachCount}" /></label>
          <label>평가 월 (쉼표 구분) <input type="text" class="tpl-months" value="${esc((g.mainMonths || []).join(', '))}" /></label>
        </div>`;
      })
      .join('');
  }

  function collectTemplateFromEditor() {
    const tpl = editTemplate;
    tpl.formGrade.enabled = [];
    tpl.formGrade.pinned = [];
    document.querySelectorAll('.template-grade-card').forEach((card) => {
      const prefix = card.dataset.prefix;
      if (card.querySelector('.tpl-enabled').checked) tpl.formGrade.enabled.push(prefix);
      if (card.querySelector('.tpl-pinned').checked) tpl.formGrade.pinned.push(prefix);
      tpl.formGrade.grades[prefix] = {
        title: card.querySelector('.tpl-title').value,
        mainMonths: card
          .querySelector('.tpl-months')
          .value.split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
        attachCount: parseInt(card.querySelector('.tpl-attach-count').value, 10) || 5,
        sectionTitles: {
          main: card.querySelector('.tpl-main-title').value,
          attach: card.querySelector('.tpl-attach-title').value,
        },
      };
    });
    return tpl;
  }

  async function deployTemplate() {
    try {
      const tpl = collectTemplateFromEditor();
      await TemplateStore.deployViaApi(tpl);
      document.getElementById('template-status').textContent =
        `배포 완료 · v${tpl.version} · ${tpl.deployedAt?.slice(0, 19).replace('T', ' ')}`;
      showToast('양식이 배포되었습니다.');
    } catch (e) {
      showToast(e.message);
    }
  }

  async function loadTemplate() {
    try {
      await TemplateStore.fetchFromCloud();
      renderTemplateEditor();
      const t = TemplateStore.getLive();
      document.getElementById('template-status').textContent = t.deployedAt
        ? `현재 v${t.version} · ${t.deployedAt.slice(0, 19).replace('T', ' ')}`
        : '배포된 양식 없음 (기본값)';
    } catch (e) {
      showToast(e.message);
    }
  }

  async function runGemini() {
    const formType = document.getElementById('gemini-form-type').value;
    const prompt = document.getElementById('gemini-prompt').value;
    const resultEl = document.getElementById('gemini-result');
    resultEl.innerHTML = '<p class="cloud-loading">Gemini 분석 중…</p>';
    const items = itemsByType(formType).length ? itemsByType(formType) : await CloudStore.listSubmissions(formType);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey() },
        body: JSON.stringify({ formType, prompt, submissions: items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '분석 실패');
      resultEl.innerHTML = `<div class="gemini-text">${esc(data.analysis).replace(/\n/g, '<br>')}</div>`;
    } catch (e) {
      resultEl.innerHTML = `<p class="cloud-empty">${esc(e.message)}</p>`;
    }
  }

  async function pullMaster() {
    try {
      const res = await CloudStore.loadMasterViaApi();
      MasterSheet.save(res.master || res);
      showToast('마스터 불러옴');
    } catch (e) {
      showToast(e.message);
    }
  }

  async function pushMaster() {
    try {
      await CloudStore.saveMasterViaApi(MasterSheet.getData());
      showToast('마스터 저장됨');
    } catch (e) {
      showToast(e.message);
    }
  }

  async function mergeEventEval() {
    try {
      const items = await CloudStore.listSubmissions('event-eval');
      const merged = CloudStore.mergeEventEvalIntoMaster(MasterSheet.getData(), items);
      MasterSheet.save(merged);
      showToast(`${items.length}건 반영`);
    } catch (e) {
      showToast(e.message);
    }
  }

  function initPanels() {
    try {
      initEventFilters();
      renderTemplateEditor();
      loadTemplate();
      if (CloudStore.isConfigured()) {
        loadSubmissions().catch(() => {});
      }
      searchEvents();
    } catch (e) {
      console.error(e);
      showToast('일부 기능을 불러오지 못했습니다.');
    }
  }

  function init() {
    showGate();
    bindGate();
    bindNav();
    tryRestoreSession();
  }

  return {
    init,
    loadSubmissions,
    showAggregate,
    searchEvents,
    deployTemplate,
    loadTemplate,
    runGemini,
    pullMaster,
    pushMaster,
    mergeEventEval,
  };
})();

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

document.addEventListener('DOMContentLoaded', () => AdminDashboard.init());
