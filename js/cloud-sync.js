const CloudSync = (() => {
  function statusEl() {
    return document.getElementById('cloud-status');
  }

  function setStatus(text, ok = true) {
    const el = statusEl();
    if (!el) return;
    el.textContent = text;
    el.dataset.state = ok ? 'ok' : 'warn';
  }

  async function init() {
    if (!CloudStore.isConfigured()) {
      setStatus('클라우드: 미연결 (.env 설정 필요)', false);
      return;
    }
    try {
      await CloudStore.init();
      setStatus('클라우드: 연결됨');
    } catch (e) {
      setStatus(`클라우드: 오류 (${e.message})`, false);
    }
  }

  function buttonHtml(label, onclick) {
    if (!CloudStore.isConfigured()) return '';
    return `<button type="button" class="btn btn-outline btn-sm cloud-btn" onclick="${onclick}">${label}</button>`;
  }

  async function submitPayload({ formType, formKey, personName, label, data }) {
    if (!personName?.trim()) {
      showToast('담당자 이름을 입력한 뒤 제출하세요.');
      return;
    }
    try {
      await CloudStore.submit({ formType, formKey, personName: personName.trim(), label, data });
      showToast('클라우드에 제출되었습니다.');
    } catch (e) {
      showToast(e.message || '제출 실패');
    }
  }

  /** 행사 마스터 — 담당자가 본인 행의 좋았던 점/보완점만 제출 */
  async function submitEventEval() {
    const personName =
      document.getElementById('f5-person-filter')?.value?.trim() ||
      document.getElementById('f5-writer')?.value?.trim();
    if (!personName) {
      showToast('담당자 필터 또는 관리자 이름을 입력하세요.');
      return;
    }
    const rows = [];
    document.querySelectorAll('#form5 tbody tr').forEach((tr) => {
      if (tr.hidden) return;
      const dept = tr.querySelector('.dept-input')?.value || '';
      if (!namesMatch(dept, personName)) return;
      rows.push({
        id: tr.dataset.id,
        goodPoints: tr.querySelector('.good-input')?.value || '',
        improvePoints: tr.querySelector('.improve-input')?.value || '',
      });
    });
    if (!rows.length) {
      showToast('제출할 행사 평가가 없습니다.');
      return;
    }
    await submitPayload({
      formType: 'event-eval',
      formKey: 'master',
      personName,
      label: `행사평가 · ${personName}`,
      data: { rows },
    });
  }

  async function submitFormGrade(prefix) {
    const cfg = FormGrade.getConfig(prefix);
    FormGrade.saveMain(prefix);
    FormGrade.saveAttach(prefix);
    const raw = localStorage.getItem(FormGrade.storageKey(cfg.id));
    const data = raw ? JSON.parse(raw) : {};
    const personName = document.getElementById(`${prefix}-attendees`)?.value?.split(/[,，]/)[0]?.trim() || '';
    await submitPayload({
      formType: 'form-grade',
      formKey: prefix,
      personName: personName || cfg.label,
      label: `${cfg.label} 협의록`,
      data,
    });
  }

  async function submitForm4() {
    Form4.save();
    const tab = Form4.getActiveTab?.();
    if (!tab) return;
    const personName = tab.writer?.trim() || tab.name;
    await submitPayload({
      formType: 'form4',
      formKey: tab.id,
      personName,
      label: `교과/비교과 · ${tab.name}`,
      data: tab,
    });
  }

  async function submitForm6() {
    Form6.persistStore?.();
    const personName = document.getElementById('f6-viewer-name')?.value?.trim() || '';
    const store = Form6.getStore?.() || {};
    await submitPayload({
      formType: 'form6',
      formKey: Form6.getActiveDeptId?.() || 'all',
      personName: personName || '부서',
      label: `부서협의록 · ${personName || '전체'}`,
      data: { store, viewerName: personName, deptId: Form6.getActiveDeptId?.() },
    });
  }

  /** 관리자: 제출물 목록 렌더 */
  async function refreshSubmissionList() {
    const listEl = document.getElementById('f5-submission-list');
    if (!listEl) return;
    listEl.innerHTML = '<p class="cloud-loading">불러오는 중…</p>';
    try {
      const items = await CloudStore.listSubmissions();
      if (!items.length) {
        listEl.innerHTML = '<p class="cloud-empty">제출된 파일이 없습니다.</p>';
        return;
      }
      listEl.innerHTML = items
        .map(
          (item) => `
        <div class="submission-item" data-id="${esc(item.id)}">
          <div class="submission-meta">
            <strong>${esc(item.label || item.formType)}</strong>
            <span>${esc(item.personName)} · ${esc(item.updatedAt?.slice(0, 16).replace('T', ' '))}</span>
          </div>
          <span class="submission-type">${esc(item.formType)}</span>
        </div>`
        )
        .join('');
    } catch (e) {
      listEl.innerHTML = `<p class="cloud-empty">${esc(e.message)}</p>`;
    }
  }

  /** 관리자: 행사 평가 제출물 → 마스터 병합 */
  async function mergeSubmissionsToMaster() {
    if (!confirm('클라우드 제출물(행사 평가)을 마스터 시트에 반영하시겠습니까?')) return;
    try {
      const items = await CloudStore.listSubmissions('event-eval');
      let master = MasterSheet.getData();
      master = CloudStore.mergeEventEvalIntoMaster(master, items);
      MasterSheet.save(master);
      Form5.load();
      showToast(`${items.length}건의 행사 평가 제출물을 반영했습니다.`);
      document.dispatchEvent(new CustomEvent('master-updated'));
    } catch (e) {
      showToast(e.message || '반영 실패');
    }
  }

  /** 관리자: 마스터 → 클라우드 저장 */
  async function pushMasterToCloud() {
    const master = MasterSheet.getData();
    master.writer = document.getElementById('f5-writer')?.value || master.writer;
    master.date = document.getElementById('f5-date')?.value || master.date;
    try {
      await CloudStore.saveMasterViaApi({ ...master, updatedAt: new Date().toISOString() });
      showToast('마스터 시트가 클라우드에 저장되었습니다.');
    } catch (e) {
      showToast(e.message || '클라우드 저장 실패');
    }
  }

  /** 관리자: 클라우드 → 마스터 불러오기 */
  async function pullMasterFromCloud() {
    if (!confirm('클라우드 마스터 시트를 불러오면 로컬 마스터가 덮어씌워집니다. 계속하시겠습니까?')) return;
    try {
      const res = await CloudStore.loadMasterViaApi();
      const master = res.master || res;
      if (!master.rows?.length) throw new Error('마스터 데이터가 비어 있습니다.');
      MasterSheet.save(master);
      Form5.load();
      showToast('클라우드 마스터를 불러왔습니다.');
      document.dispatchEvent(new CustomEvent('master-updated'));
    } catch (e) {
      showToast(e.message || '불러오기 실패');
    }
  }

  function adminPanelHtml() {
    if (!CloudStore.isConfigured()) {
      return `<div class="cloud-panel cloud-panel-disabled no-print">
        <p>Firebase 미설정 — <code>.env.example</code>을 참고해 <code>.env</code> 작성 후 <code>npm run build</code></p>
      </div>`;
    }
    return `
      <div class="cloud-panel no-print">
        <h3 class="section-title cloud-panel-title">클라우드 제출물 관리</h3>
        <p class="cloud-panel-desc">담당자가 제출한 파일을 모아 마스터 시트에서 관리합니다.</p>
        <div class="cloud-panel-actions">
          ${buttonHtml('제출물 새로고침', 'CloudSync.refreshSubmissionList()')}
          ${buttonHtml('행사평가 → 마스터 반영', 'CloudSync.mergeSubmissionsToMaster()')}
          ${buttonHtml('마스터 클라우드 저장', 'CloudSync.pushMasterToCloud()')}
          ${buttonHtml('마스터 클라우드 불러오기', 'CloudSync.pullMasterFromCloud()')}
        </div>
        <div id="f5-submission-list" class="submission-list"></div>
      </div>`;
  }

  return {
    init,
    buttonHtml,
    adminPanelHtml,
    submitEventEval,
    submitFormGrade,
    submitForm4,
    submitForm6,
    refreshSubmissionList,
    mergeSubmissionsToMaster,
    pushMasterToCloud,
    pullMasterFromCloud,
  };
})();
