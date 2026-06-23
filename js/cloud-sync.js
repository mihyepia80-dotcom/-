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
      const ok = await CloudStore.init();
      if (!ok) {
        setStatus('클라우드: 서버 미연결 (npm run dev · FIREBASE_SERVICE_ACCOUNT 확인)', false);
        return;
      }
      setStatus('클라우드: 연결됨 · 저장 시 관리자 확인 가능');
    } catch (e) {
      setStatus(`클라우드: 오류 (${e.message})`, false);
    }
  }

  function requireName(name, hint = '작성자 이름') {
    const n = String(name ?? '').trim();
    if (!n) {
      showToast(`${hint}을(를) 입력한 뒤 이용하세요.`);
      return null;
    }
    return n;
  }

  /** 저장 버튼 → Firestore 동기화 (관리자 대시보드에서 확인) */
  async function syncSave({ formType, formKey, personName, label, data }) {
    if (!CloudStore.isConfigured()) return false;
    const person = requireName(personName);
    if (!person) return false;
    try {
      await CloudStore.submit({ formType, formKey, personName: person, label, data });
      return true;
    } catch (e) {
      showToast(`클라우드 저장 실패: ${e.message}`);
      return false;
    }
  }

  /** 작성자 — 클라oud 저장본 불러오기 */
  async function loadSave({ formType, formKey, personName, onApply }) {
    if (!CloudStore.isConfigured()) {
      showToast('클라우드가 설정되지 않았습니다.');
      return;
    }
    const person = requireName(personName);
    if (!person) return;
    try {
      const item = await CloudStore.fetchSubmission(formType, formKey, person);
      if (!item?.data) {
        showToast('저장된 파일이 없습니다.');
        return;
      }
      onApply(item.data);
      showToast(`저장본 불러옴 (${item.updatedAt?.slice(0, 16).replace('T', ' ')}`);
    } catch (e) {
      showToast(e.message || '불러오기 실패');
    }
  }

  function loadBtnHtml(onclick) {
    if (!CloudStore.isConfigured()) return '';
    return `<button type="button" class="btn btn-outline btn-sm cloud-btn" onclick="${onclick}">저장본 불러오기</button>`;
  }

  async function syncGrade(prefix, data) {
    const cfg = FormGrade.getConfig(prefix);
    const personName = document.getElementById(`${prefix}-attendees`)?.value?.split(/[,，]/)[0]?.trim() || '';
    const ok = await syncSave({
      formType: 'form-grade',
      formKey: prefix,
      personName,
      label: `${cfg.label} 협의록`,
      data,
    });
    return ok;
  }

  function loadGrade(prefix) {
    const cfg = FormGrade.getConfig(prefix);
    const personName = document.getElementById(`${prefix}-attendees`)?.value?.split(/[,，]/)[0]?.trim() || '';
    loadSave({
      formType: 'form-grade',
      formKey: prefix,
      personName,
      onApply: (data) => {
        localStorage.setItem(FormGrade.storageKey(cfg.id), JSON.stringify(data));
        FormGrade.load(prefix);
      },
    });
  }

  async function syncForm4(tab) {
    if (!tab) return false;
    return syncSave({
      formType: 'form4',
      formKey: tab.id,
      personName: tab.writer?.trim() || tab.name,
      label: `교과/비교과 · ${tab.name}`,
      data: tab,
    });
  }

  function loadForm4() {
    const tab = Form4.getActiveTab?.();
    if (!tab) return;
    const personName = tab.writer?.trim() || tab.name;
    loadSave({
      formType: 'form4',
      formKey: tab.id,
      personName,
      onApply: (data) => {
        const idx = Form4.replaceTabData?.(tab.id, data);
        if (idx === false) showToast('탭 데이터 반영 실패');
      },
    });
  }

  async function syncForm5(semester, rows, meta = {}) {
    const personName = meta.personName || document.getElementById('f5-person-filter')?.value?.trim() || document.getElementById('f5-writer')?.value?.trim() || '';
    return syncSave({
      formType: 'form5',
      formKey: semester,
      personName,
      label: `행사마스터 · ${semester} · ${personName || '관리자'}`,
      data: { semester, rows, writer: meta.writer, date: meta.date },
    });
  }

  function loadForm5(semester) {
    const personName = document.getElementById('f5-person-filter')?.value?.trim() || document.getElementById('f5-writer')?.value?.trim() || '';
    loadSave({
      formType: 'form5',
      formKey: semester,
      personName,
      onApply: (data) => {
        Form5.applyCloudRows?.(semester, data);
      },
    });
  }

  async function loadForm5All() {
    if (!CloudStore.isConfigured()) {
      showToast('클라우드가 설정되지 않았습니다.');
      return;
    }
    const personName = document.getElementById('f5-person-filter')?.value?.trim() || document.getElementById('f5-writer')?.value?.trim() || '';
    const person = requireName(personName, '담당자 이름');
    if (!person) return;
    try {
      let found = 0;
      for (const semester of ['1학기', '2학기']) {
        const item = await CloudStore.fetchSubmission('form5', semester, person);
        if (item?.data) {
          Form5.applyCloudRows?.(semester, item.data);
          found += 1;
        }
      }
      if (!found) showToast('저장된 파일이 없습니다.');
      else showToast(`저장본 ${found}건을 불러왔습니다.`);
    } catch (e) {
      showToast(e.message || '불러오기 실패');
    }
  }

  async function syncForm6() {
    Form6.persistStore?.();
    const personName = document.getElementById('f6-viewer-name')?.value?.trim() || '';
    const store = Form6.getStore?.() || {};
    return syncSave({
      formType: 'form6',
      formKey: Form6.getActiveDeptId?.() || 'all',
      personName: personName || '부서',
      label: `부서협의록 · ${personName || '전체'}`,
      data: { store, viewerName: personName, deptId: Form6.getActiveDeptId?.() },
    });
  }

  function loadForm6() {
    const personName = document.getElementById('f6-viewer-name')?.value?.trim() || '';
    loadSave({
      formType: 'form6',
      formKey: Form6.getActiveDeptId?.() || 'all',
      personName: personName || '부서',
      onApply: (data) => {
        Form6.applyCloudData?.(data);
      },
    });
  }

  return {
    init,
    loadBtnHtml,
    syncSave,
    loadSave,
    syncGrade,
    loadGrade,
    syncForm4,
    loadForm4,
    syncForm5,
    loadForm5,
    loadForm5All,
    syncForm6,
    loadForm6,
  };
})();
