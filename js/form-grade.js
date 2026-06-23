const FormGrade = (() => {
  const GRADES = [1, 2, 3, 4, 5, 6].map((n) => ({
    id: n,
    label: `${n}학년`,
    prefix: `fg${n}`,
  }));
  const MONTHS = ['3월', '4월', '5월', '6월', '7월'];

  function storageKey(gradeId) {
    return `midterm-grade${gradeId}`;
  }

  function defaultMainRows() {
    return MONTHS.map((month) => ({
      month,
      grade: '',
      content: '',
      satisfaction: '',
      goodPoints: '',
      improvePoints: '',
    }));
  }

  function defaultAttachRows(count = 5) {
    return Array.from({ length: count }, () => ({ content: '', goodPoints: '', improvePoints: '' }));
  }

  function migrateMainRow(row) {
    if (row.goodPoints !== undefined || row.improvePoints !== undefined) return row;
    return { ...row, goodPoints: row.reason || '', improvePoints: '' };
  }

  function migrateAttachRow(row) {
    if (row.goodPoints !== undefined || row.improvePoints !== undefined) return row;
    return { ...row, goodPoints: row.evaluation || '', improvePoints: '' };
  }

  function buildShell() {
    const section = document.getElementById('form-grade');
    const subTabs = GRADES.map(
      (g, i) =>
        `<button type="button" class="sub-tab-btn${i === 0 ? ' active' : ''}" data-target="panel-${g.prefix}" role="tab" aria-selected="${i === 0}">${g.label}</button>`
    ).join('');

    const panels = GRADES.map(
      (g, i) => `
      <div class="sub-panel grade-panel" id="panel-${g.prefix}" data-prefix="${g.prefix}" role="tabpanel" ${i === 0 ? '' : 'hidden'}>
        <div class="form-header">
          <h2 class="grade-title">2026학년도 1학기 교육활동 평가 협의록 — ${g.label}</h2>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" onclick="FormGrade.exportExcel('${g.prefix}')">Excel</button>
            <button type="button" class="btn btn-outline" onclick="window.print()">인쇄</button>
          </div>
        </div>
        <div class="meta-fields no-print">
          <label>협의일 <input type="date" id="${g.prefix}-date" /></label>
          <label>참석자 <input type="text" id="${g.prefix}-attendees" placeholder="참석 교사명" /></label>
        </div>
        <div class="split-layout">
          <div class="split-side">
            <h3 class="section-title side-title">월별 행사 확인</h3>
            <p class="side-desc">마스터 시트 연동 · 4개 항목만 표시</p>
            <div class="master-view-wrap table-wrap">
              <div id="${g.prefix}-master-view" class="master-view"></div>
            </div>
          </div>
          <div class="split-main">
        <div class="section-header">
          <h3 class="section-title">교육활동 평가</h3>
          <div class="table-actions no-print">
            <button type="button" class="btn btn-secondary btn-sm" onclick="FormGrade.addMainRow('${g.prefix}')">행 추가</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="FormGrade.saveMain('${g.prefix}')">저장</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="FormGrade.resetMain('${g.prefix}')">초기화</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="eval-table">
            <thead>
              <tr>
                <th class="col-month">월</th>
                <th class="col-grade">대상학년<br><small>(시간)</small></th>
                <th class="col-content">내 용</th>
                <th class="col-satisfaction">만족도<br><small>5, 4, 3, 2, 1</small></th>
                <th class="col-reason">평가 사유</th>
                <th class="col-action no-print">삭제</th>
              </tr>
            </thead>
            <tbody id="${g.prefix}-main-body"></tbody>
          </table>
        </div>
        <div class="section-header">
          <h3 class="section-title attach-title">학년별 협의록 첨부 양식</h3>
          <div class="table-actions no-print">
            <button type="button" class="btn btn-secondary btn-sm" onclick="FormGrade.addAttachRow('${g.prefix}')">행 추가</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="FormGrade.saveAttach('${g.prefix}')">저장</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="FormGrade.resetAttach('${g.prefix}')">초기화</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="eval-table attach-table">
            <thead>
              <tr>
                <th class="col-num">번호</th>
                <th>교사‧학부모 및 기타 내용</th>
                <th class="col-good">좋았던 점</th>
                <th class="col-improve">보완이 필요한 점</th>
                <th class="col-action no-print">삭제</th>
              </tr>
            </thead>
            <tbody id="${g.prefix}-attach-body"></tbody>
          </table>
        </div>
          </div>
        </div>
      </div>`
    ).join('');

    section.innerHTML = `
      <div class="form-header form-header-main">
        <h2>학년 협의록</h2>
        <p class="form-desc">1학년~6학년 교육활동 평가 및 첨부 양식</p>
      </div>
      <nav class="sub-tab-nav" id="grade-subtabs" role="tablist">${subTabs}</nav>
      <div id="grade-panels">${panels}</div>
    `;
  }

  function createMainRow(data, index, prefix, gradeNum) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="cell-select month-select">${monthSelectOptions(data.month)}</select></td>
      <td><textarea class="cell-textarea grade-input" rows="2" placeholder="예: ${gradeNum}학년 (1시간)">${esc(data.grade)}</textarea></td>
      <td><textarea class="cell-textarea content-input" rows="3" placeholder="교육활동 내용">${esc(data.content)}</textarea></td>
      <td><div class="satisfaction-group">${satisfactionRadios(`${prefix}-sat-${index}`, data.satisfaction)}</div></td>
      <td>
        <div class="result-fields">
          <div class="result-field">
            <label>■ (좋았던 점)</label>
            <textarea class="good-input" rows="3">${esc(data.goodPoints)}</textarea>
          </div>
          <div class="result-field">
            <label>■ (보완이 필요한 점)</label>
            <textarea class="improve-input" rows="3">${esc(data.improvePoints)}</textarea>
          </div>
        </div>
      </td>
      <td class="no-print"><button type="button" class="btn btn-danger btn-sm" onclick="FormGrade.removeMainRow('${prefix}', this)">삭제</button></td>
    `;
    return tr;
  }

  function createAttachRow(data, index) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td><textarea class="cell-textarea attach-content" rows="2" placeholder="교사‧학부모 및 기타 내용">${esc(data.content)}</textarea></td>
      <td><textarea class="cell-textarea attach-good" rows="4" placeholder="좋았던 점">${esc(data.goodPoints)}</textarea></td>
      <td><textarea class="cell-textarea attach-improve" rows="4" placeholder="보완이 필요한 점">${esc(data.improvePoints)}</textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger btn-sm" onclick="FormGrade.removeAttachRow(this)">삭제</button></td>
    `;
    return tr;
  }

  function getGradeConfig(prefix) {
    return GRADES.find((g) => g.prefix === prefix);
  }

  function getMainRows(prefix) {
    const rows = [];
    document.querySelectorAll(`#${prefix}-main-body tr`).forEach((tr, index) => {
      const checked = tr.querySelector(`input[name="${prefix}-sat-${index}"]:checked`);
      rows.push({
        month: tr.querySelector('.month-select').value,
        grade: tr.querySelector('.grade-input').value,
        content: tr.querySelector('.content-input').value,
        satisfaction: checked ? checked.value : '',
        goodPoints: tr.querySelector('.good-input').value,
        improvePoints: tr.querySelector('.improve-input').value,
      });
    });
    return rows;
  }

  function getAttachRows(prefix) {
    const rows = [];
    document.querySelectorAll(`#${prefix}-attach-body tr`).forEach((tr) => {
      rows.push({
        content: tr.querySelector('.attach-content').value,
        goodPoints: tr.querySelector('.attach-good').value,
        improvePoints: tr.querySelector('.attach-improve').value,
      });
    });
    return rows;
  }

  function renderMainRows(prefix, rows) {
    const cfg = getGradeConfig(prefix);
    const tbody = document.getElementById(`${prefix}-main-body`);
    tbody.innerHTML = '';
    rows.forEach((row, i) => tbody.appendChild(createMainRow(migrateMainRow(row), i, prefix, cfg.id)));
  }

  function renderAttachRows(prefix, rows) {
    const tbody = document.getElementById(`${prefix}-attach-body`);
    tbody.innerHTML = '';
    rows.forEach((row, i) => tbody.appendChild(createAttachRow(migrateAttachRow(row), i)));
  }

  function readStored(prefix) {
    const cfg = getGradeConfig(prefix);
    const raw = localStorage.getItem(storageKey(cfg.id));
    if (!raw) return { date: '', attendees: '', mainRows: defaultMainRows(), attachRows: defaultAttachRows() };
    try {
      const data = JSON.parse(raw);
      return {
        date: data.date || '',
        attendees: data.attendees || '',
        mainRows: data.mainRows?.length ? data.mainRows.map(migrateMainRow) : defaultMainRows(),
        attachRows: data.attachRows?.length ? data.attachRows.map(migrateAttachRow) : defaultAttachRows(),
      };
    } catch {
      return { date: '', attendees: '', mainRows: defaultMainRows(), attachRows: defaultAttachRows() };
    }
  }

  function writeStored(prefix, partial) {
    const cfg = getGradeConfig(prefix);
    const current = readStored(prefix);
    const data = {
      date: partial.date !== undefined ? partial.date : document.getElementById(`${prefix}-date`).value,
      attendees: partial.attendees !== undefined ? partial.attendees : document.getElementById(`${prefix}-attendees`).value,
      mainRows: partial.mainRows !== undefined ? partial.mainRows : current.mainRows,
      attachRows: partial.attachRows !== undefined ? partial.attachRows : current.attachRows,
    };
    localStorage.setItem(storageKey(cfg.id), JSON.stringify(data));
    return data;
  }

  function save(prefix) {
    writeStored(prefix, { mainRows: getMainRows(prefix), attachRows: getAttachRows(prefix) });
    const cfg = getGradeConfig(prefix);
    showToast(`${cfg.label} 협의록이 저장되었습니다.`);
  }

  function saveMain(prefix) {
    writeStored(prefix, { mainRows: getMainRows(prefix) });
    const cfg = getGradeConfig(prefix);
    showToast(`${cfg.label} 교육활동 평가가 저장되었습니다.`);
  }

  function saveAttach(prefix) {
    writeStored(prefix, { attachRows: getAttachRows(prefix) });
    const cfg = getGradeConfig(prefix);
    showToast(`${cfg.label} 첨부 양식이 저장되었습니다.`);
  }

  function load(prefix) {
    const cfg = getGradeConfig(prefix);
    const raw = localStorage.getItem(storageKey(cfg.id));
    if (!raw) {
      renderMainRows(prefix, defaultMainRows());
      renderAttachRows(prefix, defaultAttachRows());
      return;
    }
    try {
      const data = JSON.parse(raw);
      document.getElementById(`${prefix}-date`).value = data.date || '';
      document.getElementById(`${prefix}-attendees`).value = data.attendees || '';
      renderMainRows(prefix, (data.mainRows?.length ? data.mainRows : defaultMainRows()).map(migrateMainRow));
      renderAttachRows(prefix, (data.attachRows?.length ? data.attachRows : defaultAttachRows()).map(migrateAttachRow));
    } catch {
      renderMainRows(prefix, defaultMainRows());
      renderAttachRows(prefix, defaultAttachRows());
    }
  }

  function bindEvents(prefix) {
    document.getElementById(`${prefix}-date`).addEventListener('change', () => save(prefix));
    document.getElementById(`${prefix}-attendees`).addEventListener('input', debounce(() => save(prefix), 800));
    document.getElementById(`${prefix}-main-body`).addEventListener('input', debounce(() => save(prefix), 800));
    document.getElementById(`${prefix}-main-body`).addEventListener('change', debounce(() => save(prefix), 800));
    document.getElementById(`${prefix}-attach-body`).addEventListener('input', debounce(() => save(prefix), 800));
  }

  function addMainRow(prefix) {
    const cfg = getGradeConfig(prefix);
    const tbody = document.getElementById(`${prefix}-main-body`);
    tbody.appendChild(createMainRow({}, tbody.children.length, prefix, cfg.id));
  }

  function removeMainRow(prefix, btn) {
    const tbody = document.getElementById(`${prefix}-main-body`);
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    btn.closest('tr').remove();
    renderMainRows(prefix, getMainRows(prefix));
    save(prefix);
  }

  function addAttachRow(prefix) {
    const tbody = document.getElementById(`${prefix}-attach-body`);
    tbody.appendChild(createAttachRow({}, tbody.children.length));
  }

  function removeAttachRow(btn) {
    const tbody = btn.closest('tbody');
    const prefix = tbody.id.replace('-attach-body', '');
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    btn.closest('tr').remove();
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      tr.querySelector('.col-num').textContent = i + 1;
    });
    save(prefix);
  }

  function resetMain(prefix) {
    const cfg = getGradeConfig(prefix);
    if (!confirm(`${cfg.label} 교육활동 평가 표를 초기화하시겠습니까?`)) return;
    const rows = defaultMainRows();
    writeStored(prefix, { mainRows: rows });
    renderMainRows(prefix, rows);
    showToast(`${cfg.label} 교육활동 평가가 초기화되었습니다.`);
  }

  function resetAttach(prefix) {
    const cfg = getGradeConfig(prefix);
    if (!confirm(`${cfg.label} 첨부 양식을 초기화하시겠습니까?`)) return;
    const rows = defaultAttachRows();
    writeStored(prefix, { attachRows: rows });
    renderAttachRows(prefix, rows);
    showToast(`${cfg.label} 첨부 양식이 초기화되었습니다.`);
  }

  function reset(prefix) {
    const cfg = getGradeConfig(prefix);
    if (!confirm(`${cfg.label} 협의록을 초기화하시겠습니까?`)) return;
    localStorage.removeItem(storageKey(cfg.id));
    document.getElementById(`${prefix}-date`).value = todayStr();
    document.getElementById(`${prefix}-attendees`).value = '';
    renderMainRows(prefix, defaultMainRows());
    renderAttachRows(prefix, defaultAttachRows());
    showToast(`${cfg.label} 협의록이 초기화되었습니다.`);
  }

  function refreshMasterViews() {
    GRADES.forEach(({ prefix, id }) => {
      renderMasterTable(`${prefix}-master-view`, id);
    });
  }

  function exportExcel(prefix) {
    const cfg = getGradeConfig(prefix);
    save(prefix);
    const raw = localStorage.getItem(storageKey(cfg.id));
    const data = raw ? JSON.parse(raw) : {};
    const main = (data.mainRows || []).map((r) => {
      const row = migrateMainRow(r);
      return [row.month, row.grade, row.content, row.satisfaction, row.goodPoints, row.improvePoints];
    });
    const attach = (data.attachRows || []).map((r, i) => {
      const row = migrateAttachRow(r);
      return [i + 1, row.content, row.goodPoints, row.improvePoints];
    });
    ExcelIO.download(`${cfg.label}_협의록.xlsx`, '교육활동평가', ['월', '대상학년', '내용', '만족도', '좋았던점', '보완점'], main);
    if (attach.length) {
      setTimeout(() => {
        ExcelIO.download(`${cfg.label}_첨부.xlsx`, '첨부', ['번호', '교사학부모기타', '좋았던점', '보완점'], attach);
      }, 400);
    }
    showToast(`${cfg.label} Excel을 다운로드했습니다.`);
  }

  function init() {
    buildShell();
    initSubTabs('grade-subtabs', '.grade-panel');
    GRADES.forEach(({ prefix }) => {
      load(prefix);
      bindEvents(prefix);
    });
    refreshMasterViews();
    document.addEventListener('master-updated', refreshMasterViews);
  }

  return {
    init,
    addMainRow,
    removeMainRow,
    addAttachRow,
    removeAttachRow,
    save,
    saveMain,
    saveAttach,
    reset,
    resetMain,
    resetAttach,
    exportExcel,
    getConfig: getGradeConfig,
    storageKey,
  };
})();
