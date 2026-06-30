const Form4 = (() => {
  const STORAGE_KEY = 'midterm-form4';
  const CATEGORIES = ['본인', '주관', '행사', '업무'];
  let tabs = [];
  let activeTabId = null;

  function newTabId() {
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function defaultTab(name) {
    return {
      id: newTabId(),
      name,
      writer: '',
      date: todayStr(),
      mainRows: CATEGORIES.map((category) => ({
        category,
        target: '',
        program: '',
        satisfaction: '',
        reason: '',
      })),
      attachRows: Array.from({ length: 8 }, () => ({ content: '', evaluation: '' })),
    };
  }

  function defaultAttachRows(count = 8) {
    return Array.from({ length: count }, () => ({ content: '', evaluation: '' }));
  }

  function getActiveTab() {
    return tabs.find((t) => t.id === activeTabId);
  }

  function tabLabel(name) {
    return name.length > 8 ? `${name.slice(0, 8)}…` : name;
  }

  function buildShell() {
    const section = document.getElementById('form4');
    section.innerHTML = `
      <div class="form-header form-header-main">
        <h2>교과/비교과 교육활동 평가</h2>
        <p class="form-desc">교과·비교과 프로그램별 평가 · (교과 및 비교과) 협의 의견 반영</p>
      </div>
      <div class="split-layout form4-split">
        <div class="split-side">
          <h3 class="section-title side-title">월별 행사 확인</h3>
          <p class="side-desc">전체 행사 · 월/학년/키워드 검색</p>
          <div class="master-view-wrap table-wrap">
            <div id="f4-master-view" class="master-view"></div>
          </div>
        </div>
        <div class="split-main form4-main">
          <nav class="sub-tab-nav sub-tab-nav-with-add" id="f4-subtabs" role="tablist"></nav>
          <div id="f4-panels"></div>
        </div>
      </div>
    `;
  }

  function renderSubTabs() {
    const nav = document.getElementById('f4-subtabs');
    nav.innerHTML =
      tabs
        .map(
          (tab) => `
        <button type="button" class="sub-tab-btn${tab.id === activeTabId ? ' active' : ''}"
          data-target="panel-${tab.id}" data-tab-id="${tab.id}" role="tab"
          aria-selected="${tab.id === activeTabId}"
          title="${esc(tab.name)}">${esc(tabLabel(tab.name))}</button>`
        )
        .join('') +
      `<button type="button" class="sub-tab-add no-print" title="탭 추가">+</button>`;
  }

  function panelHtml(tab, isActive) {
    return `
      <div class="sub-panel f4-panel" id="panel-${tab.id}" data-tab-id="${tab.id}" role="tabpanel" ${isActive ? '' : 'hidden'}>
        <div class="form-header">
          <h2>${esc(tab.name)} — 교육활동 평가</h2>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" onclick="Form4.exportExcel()">Excel</button>
            <button type="button" class="btn btn-outline" onclick="window.print()">인쇄</button>
            ${typeof CloudSync !== 'undefined' ? CloudSync.loadBtnHtml('CloudSync.loadForm4()') : ''}
            ${tabs.length > 1 ? `<button type="button" class="btn btn-danger no-print" onclick="Form4.removeTab('${tab.id}')">탭 삭제</button>` : ''}
          </div>
        </div>
        <div class="meta-fields no-print">
          <label>탭 이름 <input type="text" class="tab-name-input" value="${esc(tab.name)}" placeholder="예: 국어, 음악, 동아리" /></label>
          <label>작성자 <input type="text" class="tab-writer-input" value="${esc(tab.writer)}" placeholder="담당 교사" /></label>
          <label>작성일 <input type="date" class="tab-date-input" value="${esc(tab.date)}" /></label>
        </div>
        <div class="section-header">
          <h3 class="section-title">교육활동 평가</h3>
          <div class="table-actions no-print">
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form4.addMainRow()">행 추가</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="Form4.saveMainTable()">저장</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form4.resetMainTable()">초기화</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="eval-table">
            <thead>
              <tr>
                <th class="col-category">구분</th>
                <th class="col-target">대상<br><small>(학년 또는 교사)</small></th>
                <th class="col-content">프로그램 내용</th>
                <th class="col-satisfaction">만족도<br><small>5, 4, 3, 2, 1</small></th>
                <th class="col-reason">평가 사유<br><small>(좋았던 점 or 보완이 필요한 점)</small></th>
                <th class="col-action no-print">삭제</th>
              </tr>
            </thead>
            <tbody class="f4-main-body"></tbody>
          </table>
        </div>
        <div class="section-header">
          <h3 class="section-title attach-title">교사‧학부모 및 기타 내용</h3>
          <div class="table-actions no-print">
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form4.addAttachRow()">행 추가</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="Form4.saveAttachTable()">저장</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form4.resetAttachTable()">초기화</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="eval-table attach-table">
            <thead>
              <tr>
                <th class="col-num">번호</th>
                <th>교사‧학부모 및 기타 내용</th>
                <th>좋았던 점 or 보완이 필요한 점 자유 기술</th>
                <th class="col-action no-print">삭제</th>
              </tr>
            </thead>
            <tbody class="f4-attach-body"></tbody>
          </table>
        </div>
      </div>`;
  }

  function createMainRow(data, index, tabId) {
    const tr = document.createElement('tr');
    const isCustom = !CATEGORIES.includes(data.category);
    tr.innerHTML = `
      <td class="col-category">${
        isCustom
          ? `<input type="text" class="cell-input category-input" value="${esc(data.category)}" placeholder="구분" />`
          : `<strong>${esc(data.category)}</strong>`
      }</td>
      <td><textarea class="cell-textarea target-input" rows="2" placeholder="학년 또는 교사">${esc(data.target)}</textarea></td>
      <td><textarea class="cell-textarea program-input" rows="3" placeholder="프로그램 내용">${esc(data.program)}</textarea></td>
      <td><div class="satisfaction-group">${satisfactionRadios(`${tabId}-sat-${index}`, data.satisfaction)}</div></td>
      <td><textarea class="cell-textarea reason-input" rows="5" placeholder="좋았던 점 or 보완이 필요한 점">${esc(data.reason)}</textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger btn-sm" onclick="Form4.removeMainRow(this)">삭제</button></td>
    `;
    return tr;
  }

  function createAttachRow(data, index) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td><textarea class="cell-textarea attach-content" rows="2" placeholder="교사‧학부모 및 기타 내용">${esc(data.content)}</textarea></td>
      <td><textarea class="cell-textarea attach-eval" rows="4" placeholder="좋았던 점 or 보완이 필요한 점">${esc(data.evaluation)}</textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger btn-sm" onclick="Form4.removeAttachRow(this)">삭제</button></td>
    `;
    return tr;
  }

  function getActivePanel() {
    return document.querySelector(`.f4-panel[data-tab-id="${activeTabId}"]`);
  }

  function readPanelData(panel) {
    const tabId = panel.dataset.tabId;
    const mainRows = [];
    panel.querySelectorAll('.f4-main-body tr').forEach((tr, index) => {
      const checked = tr.querySelector(`input[name="${tabId}-sat-${index}"]:checked`);
      mainRows.push({
        category: tr.querySelector('.col-category strong')?.textContent || tr.querySelector('.category-input')?.value || '',
        target: tr.querySelector('.target-input').value,
        program: tr.querySelector('.program-input').value,
        satisfaction: checked ? checked.value : '',
        reason: tr.querySelector('.reason-input').value,
      });
    });
    const attachRows = [];
    panel.querySelectorAll('.f4-attach-body tr').forEach((tr) => {
      attachRows.push({
        content: tr.querySelector('.attach-content').value,
        evaluation: tr.querySelector('.attach-eval').value,
      });
    });
    return {
      name: panel.querySelector('.tab-name-input').value.trim() || '이름 없음',
      writer: panel.querySelector('.tab-writer-input').value,
      date: panel.querySelector('.tab-date-input').value,
      mainRows,
      attachRows,
    };
  }

  function syncActiveTabFromDOM() {
    const panel = getActivePanel();
    if (!panel) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    Object.assign(tab, readPanelData(panel));
  }

  function fillPanel(panel, tab) {
    panel.querySelector('.tab-name-input').value = tab.name;
    panel.querySelector('.tab-writer-input').value = tab.writer || '';
    panel.querySelector('.tab-date-input').value = tab.date || todayStr();

    const mainBody = panel.querySelector('.f4-main-body');
    mainBody.innerHTML = '';
    (tab.mainRows?.length ? tab.mainRows : defaultTab(tab.name).mainRows).forEach((row, i) => {
      mainBody.appendChild(createMainRow(row, i, tab.id));
    });

    const attachBody = panel.querySelector('.f4-attach-body');
    attachBody.innerHTML = '';
    (tab.attachRows?.length ? tab.attachRows : defaultAttachRows()).forEach((row, i) => {
      attachBody.appendChild(createAttachRow(row, i));
    });
  }

  function renderAll() {
    renderSubTabs();
    const container = document.getElementById('f4-panels');
    container.innerHTML = tabs.map((tab) => panelHtml(tab, tab.id === activeTabId)).join('');
    tabs.forEach((tab) => {
      const panel = document.getElementById(`panel-${tab.id}`);
      fillPanel(panel, tab);
      bindPanelEvents(panel);
    });
  }

  function onSubtabChange(e) {
    syncActiveTabFromDOM();
    const targetBtn = e.detail.btn;
    if (targetBtn?.dataset.tabId) activeTabId = targetBtn.dataset.tabId;
    persist();
  }

  function bindPanelEvents(panel) {
    const tabId = panel.dataset.tabId;
    panel.querySelector('.tab-name-input').addEventListener('input', debounce(() => {
      syncActiveTabFromDOM();
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        const btn = document.querySelector(`#f4-subtabs [data-tab-id="${tabId}"]`);
        if (btn) btn.textContent = tabLabel(tab.name);
        btn.title = tab.name;
      }
      persist();
    }, 400));
    ['tab-writer-input', 'tab-date-input'].forEach((cls) => {
      panel.querySelector(`.${cls}`).addEventListener('change', () => {
        syncActiveTabFromDOM();
        persist();
      });
    });
    panel.querySelector('.f4-main-body').addEventListener('input', debounce(() => {
      syncActiveTabFromDOM();
      persist();
    }, 800));
    panel.querySelector('.f4-main-body').addEventListener('change', debounce(() => {
      syncActiveTabFromDOM();
      persist();
    }, 800));
    panel.querySelector('.f4-attach-body').addEventListener('input', debounce(() => {
      syncActiveTabFromDOM();
      persist();
    }, 800));
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeTabId, tabs })
    );
  }

  function save() {
    syncActiveTabFromDOM();
    persist();
    const tab = getActiveTab();
    showToast(`「${tab?.name || '평가'}」이 저장되었습니다.`);
  }

  async function saveMainTable() {
    const panel = getActivePanel();
    if (!panel) return;
    syncActiveTabFromDOM();
    const tab = getActiveTab();
    if (tab) tab.mainRows = readPanelData(panel).mainRows;
    persist();
    const synced = tab ? await CloudSync.syncForm4(tab) : false;
    showToast(`「${tab?.name}」 평가 표가 저장되었습니다.${CloudSync.cloudHint(synced)}`);
  }

  async function saveAttachTable() {
    const panel = getActivePanel();
    if (!panel) return;
    syncActiveTabFromDOM();
    const tab = getActiveTab();
    if (tab) tab.attachRows = readPanelData(panel).attachRows;
    persist();
    const synced = tab ? await CloudSync.syncForm4(tab) : false;
    showToast(`「${tab?.name}」 첨부 표가 저장되었습니다.${CloudSync.cloudHint(synced)}`);
  }

  function replaceTabData(tabId, data) {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return false;
    tabs[idx] = { ...tabs[idx], ...data, id: tabId };
    const panel = document.getElementById(`panel-${tabId}`);
    if (panel) fillPanel(panel, tabs[idx]);
    persist();
    return idx;
  }

  function resetMainTable() {
    const tab = getActiveTab();
    if (!tab || !confirm(`「${tab.name}」 평가 표를 초기화하시겠습니까?`)) return;
    tab.mainRows = defaultTab(tab.name).mainRows;
    const panel = getActivePanel();
    if (panel) fillPanel(panel, tab);
    persist();
    showToast(`「${tab.name}」 평가 표가 초기화되었습니다.`);
  }

  function resetAttachTable() {
    const tab = getActiveTab();
    if (!tab || !confirm(`「${tab.name}」 첨부 표를 초기화하시겠습니까?`)) return;
    tab.attachRows = defaultAttachRows();
    const panel = getActivePanel();
    if (panel) fillPanel(panel, tab);
    persist();
    showToast(`「${tab.name}」 첨부 표가 초기화되었습니다.`);
  }

  function migrateLegacy(raw) {
    try {
      const data = JSON.parse(raw);
      if (data.tabs) return data;
      return {
        activeTabId: null,
        tabs: [
          {
            id: newTabId(),
            name: '교과/비교과 1',
            writer: data.writer || '',
            date: data.date || todayStr(),
            mainRows: data.mainRows?.length ? data.mainRows : defaultTab('교과/비교과 1').mainRows,
            attachRows: data.attachRows?.length ? data.attachRows : defaultAttachRows(),
          },
        ],
      };
    } catch {
      return null;
    }
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      tabs = [defaultTab('교과'), defaultTab('비교과')];
      activeTabId = tabs[0].id;
      return;
    }
    const data = migrateLegacy(raw);
    if (!data || !data.tabs?.length) {
      tabs = [defaultTab('교과'), defaultTab('비교과')];
      activeTabId = tabs[0].id;
      return;
    }
    tabs = data.tabs;
    activeTabId = data.activeTabId && tabs.some((t) => t.id === data.activeTabId) ? data.activeTabId : tabs[0].id;
  }

  function addTab() {
    syncActiveTabFromDOM();
    const name = prompt('탭 이름을 입력하세요', '새 평가');
    if (!name?.trim()) return;
    const tab = defaultTab(name.trim());
    tabs.push(tab);
    activeTabId = tab.id;
    renderAll();
    persist();
    showToast(`「${tab.name}」 탭이 추가되었습니다.`);
  }

  function removeTab(tabId) {
    if (tabs.length <= 1) {
      showToast('최소 1개 탭은 유지해야 합니다.');
      return;
    }
    const tab = tabs.find((t) => t.id === tabId);
    if (!confirm(`「${tab?.name}」 탭을 삭제하시겠습니까?`)) return;
    tabs = tabs.filter((t) => t.id !== tabId);
    if (activeTabId === tabId) activeTabId = tabs[0].id;
    renderAll();
    persist();
    showToast('탭이 삭제되었습니다.');
  }

  function addMainRow() {
    const panel = getActivePanel();
    const tbody = panel.querySelector('.f4-main-body');
    const tabId = panel.dataset.tabId;
    tbody.appendChild(createMainRow({ category: '기타', target: '', program: '', satisfaction: '', reason: '' }, tbody.children.length, tabId));
    syncActiveTabFromDOM();
    persist();
  }

  function removeMainRow(btn) {
    const panel = btn.closest('.f4-panel');
    const tbody = panel.querySelector('.f4-main-body');
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    btn.closest('tr').remove();
    const tabId = panel.dataset.tabId;
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.mainRows = readPanelData(panel).mainRows;
      fillPanel(panel, tab);
    }
    persist();
  }

  function addAttachRow() {
    const panel = getActivePanel();
    const tbody = panel.querySelector('.f4-attach-body');
    tbody.appendChild(createAttachRow({}, tbody.children.length));
    syncActiveTabFromDOM();
    persist();
  }

  function removeAttachRow(btn) {
    const tbody = btn.closest('tbody');
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    btn.closest('tr').remove();
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      tr.querySelector('.col-num').textContent = i + 1;
    });
    syncActiveTabFromDOM();
    persist();
  }

  function resetCurrent() {
    const tab = getActiveTab();
    if (!confirm(`「${tab?.name}」 내용을 초기화하시겠습니까?`)) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    tabs[idx] = defaultTab(tab.name);
    tabs[idx].id = tab.id;
    renderAll();
    persist();
    showToast(`「${tab.name}」이 초기화되었습니다.`);
  }

  function refreshMasterView() {
    MasterView.mount('f4-master-view');
  }

  function exportExcel() {
    syncActiveTabFromDOM();
    persist();
    const tab = getActiveTab();
    if (!tab) return;
    const main = tab.mainRows.map((r) => [r.category, r.target, r.program, r.satisfaction, r.reason]);
    const attach = tab.attachRows.map((r, i) => [i + 1, r.content, r.evaluation]);
    ExcelIO.download(`${tab.name}_교과비교과.xlsx`, '평가', ['구분', '대상', '프로그램', '만족도', '평가사유'], main);
    if (attach.length) {
      setTimeout(() => {
        ExcelIO.download(`${tab.name}_첨부.xlsx`, '첨부', ['번호', '내용', '평가'], attach);
      }, 400);
    }
    showToast(`「${tab.name}」 Excel을 다운로드했습니다.`);
  }

  function init() {
    buildShell();
    load();
    renderAll();
    initSubTabs('f4-subtabs', '.f4-panel');
    refreshMasterView();
    document.addEventListener('master-updated', refreshMasterView);
    const nav = document.getElementById('f4-subtabs');
    nav.addEventListener('subtab-change', onSubtabChange);
    nav.addEventListener('click', (e) => {
      if (e.target.closest('.sub-tab-add')) addTab();
    });
  }

  return {
    init,
    addTab,
    removeTab,
    addMainRow,
    removeMainRow,
    addAttachRow,
    removeAttachRow,
    save,
    saveMainTable,
    saveAttachTable,
    resetCurrent,
    resetMainTable,
    resetAttachTable,
    exportExcel,
    getActiveTab,
    replaceTabData,
  };
})();
