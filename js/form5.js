const Form5 = (() => {
  let personFilter = '';

  function bodyId(semester) {
    return semester === '2학기' ? 'f5-body-s2' : 'f5-body-s1';
  }

  function tableToolbar(semester, label) {
    return `
      <div class="section-header">
        <h3 class="section-title ${semester === '2학기' ? 'semester-title' : ''}">${label}</h3>
        <div class="table-actions no-print">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Form5.addRow('${semester}')">행 추가</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="Form5.saveTable('${semester}')">저장</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Form5.resetTable('${semester}')">초기화</button>
        </div>
      </div>`;
  }

  function createRow(data = {}, semester = '1학기') {
    const tr = document.createElement('tr');
    tr.dataset.id = data.id || newId();
    tr.dataset.semester = semester;
    tr.dataset.dept = data.dept || '';
    if (personFilter && !namesMatch(data.dept, personFilter)) tr.hidden = true;
    tr.innerHTML = `
      <td><select class="cell-select month-select">${monthSelectOptions(data.month, semester)}</select></td>
      <td><textarea class="cell-textarea grade-input" rows="2" placeholder="예: 1학년&#10;(1시간)">${esc(data.grade)}</textarea></td>
      <td><textarea class="cell-textarea activity-input" rows="2" placeholder="주요 교육활동(행사)">${esc(data.activity)}</textarea></td>
      <td><textarea class="cell-textarea dept-input" rows="2" placeholder="부서(담당)">${esc(data.dept)}</textarea></td>
      <td><textarea class="cell-textarea good-input" rows="3" placeholder="좋았던 점">${esc(data.goodPoints)}</textarea></td>
      <td><textarea class="cell-textarea improve-input" rows="3" placeholder="보완할 점">${esc(data.improvePoints)}</textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger btn-sm" onclick="Form5.deleteRow(this)">삭제</button></td>
    `;
    return tr;
  }

  function readBody(tbodyId, semester) {
    const rows = [];
    document.querySelectorAll(`#${tbodyId} tr`).forEach((tr) => {
      rows.push({
        id: tr.dataset.id || newId(),
        semester,
        month: tr.querySelector('.month-select').value,
        grade: tr.querySelector('.grade-input').value,
        activity: tr.querySelector('.activity-input').value,
        dept: tr.querySelector('.dept-input').value,
        goodPoints: tr.querySelector('.good-input').value,
        improvePoints: tr.querySelector('.improve-input').value,
      });
    });
    return rows;
  }

  function mergeSemesterRows(semester, newSemesterRows) {
    const data = MasterSheet.getData();
    const other = data.rows.filter((r) => r.semester !== semester);
    data.rows = [...other, ...newSemesterRows];
    MasterSheet.save(data);
  }

  function renderRows(rows) {
    ['1학기', '2학기'].forEach((semester) => {
      const tbody = document.getElementById(bodyId(semester));
      const list = rows.filter((r) => r.semester === semester);
      tbody.innerHTML = '';
      (list.length ? list : MasterSheet.getRows(semester)).forEach((row) =>
        tbody.appendChild(createRow(row, semester))
      );
    });
    applyPersonFilter();
  }

  function applyPersonFilter() {
    personFilter = document.getElementById('f5-person-filter')?.value?.trim() || '';
    document.querySelectorAll('#form5 tbody tr').forEach((tr) => {
      const dept = tr.querySelector('.dept-input')?.value || tr.dataset.dept || '';
      tr.hidden = !!(personFilter && !namesMatch(dept, personFilter));
    });
  }

  function buildShell() {
    const section = document.getElementById('form5');
    section.innerHTML = `
      <div class="form-header form-header-main">
        <h2>행사 마스터 시트</h2>
        <p class="form-desc">행사 등록 · 담당자 좋았던 점/보완점 입력 · 1학기(3~7월) · 2학기(8~1월)</p>
      </div>
      <div class="meta-fields no-print">
        <label>관리자 <input type="text" id="f5-writer" placeholder="담당자" /></label>
        <label>작성일 <input type="date" id="f5-date" /></label>
        <label>담당자 필터 <input type="text" id="f5-person-filter" placeholder="본인 이름 (해당 행사만 표시)" /></label>
      </div>
      <div class="form-actions sheet-actions no-print">
        <button type="button" class="btn btn-outline" onclick="Form5.downloadExcel()">Excel 다운</button>
        <button type="button" class="btn btn-outline" onclick="Form5.uploadExcel()">Excel 업로드</button>
        ${typeof CloudSync !== 'undefined' ? CloudSync.buttonHtml('클라우드 제출 (내 평가)', 'CloudSync.submitEventEval()') : ''}
      </div>
      ${tableToolbar('1학기', '1학기 (3월 ~ 7월)')}
      <div class="table-wrap master-sheet-wrap">
        <table class="eval-table master-sheet-table">
          <thead><tr>
            <th class="col-month">월</th>
            <th class="col-grade">대상학년<br><small>(참여시간)</small></th>
            <th class="col-activity">주요 교육활동(행사)</th>
            <th class="col-dept">부서(담당)</th>
            <th class="col-good">좋았던 점</th>
            <th class="col-improve">보완할 점</th>
            <th class="col-action no-print">삭제</th>
          </tr></thead>
          <tbody id="f5-body-s1"></tbody>
        </table>
      </div>
      ${tableToolbar('2학기', '2학기 (8월 ~ 차년도 1월)')}
      <div class="table-wrap master-sheet-wrap">
        <table class="eval-table master-sheet-table">
          <thead><tr>
            <th class="col-month">월</th>
            <th class="col-grade">대상학년<br><small>(참여시간)</small></th>
            <th class="col-activity">주요 교육활동(행사)</th>
            <th class="col-dept">부서(담당)</th>
            <th class="col-good">좋았던 점</th>
            <th class="col-improve">보완할 점</th>
            <th class="col-action no-print">삭제</th>
          </tr></thead>
          <tbody id="f5-body-s2"></tbody>
        </table>
      </div>
    `;
  }

  function load() {
    buildShell();
    const data = MasterSheet.getData();
    document.getElementById('f5-writer').value = data.writer || '';
    document.getElementById('f5-date').value = data.date || todayStr();
    renderRows(data.rows);
    document.getElementById('f5-person-filter')?.addEventListener('input', debounce(applyPersonFilter, 300));
    ['f5-writer', 'f5-date'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => {
        const d = MasterSheet.getData();
        d.writer = document.getElementById('f5-writer').value;
        d.date = document.getElementById('f5-date').value;
        MasterSheet.save(d);
      });
    });
    ['f5-body-s1', 'f5-body-s2'].forEach((id) => {
      document.getElementById(id).addEventListener('input', (e) => {
        if (e.target.classList.contains('dept-input')) applyPersonFilter();
      });
    });
  }

  function addRow(semester = '1학기') {
    const row = MasterSheet.emptyRow(semester === '2학기' ? '8월' : '3월', semester);
    document.getElementById(bodyId(semester)).appendChild(createRow(row, semester));
  }

  function saveTable(semester) {
    mergeSemesterRows(semester, readBody(bodyId(semester), semester));
    showToast(`${semester} 행사 마스터가 저장되었습니다.`);
    document.dispatchEvent(new CustomEvent('master-updated'));
  }

  function resetTable(semester) {
    if (!confirm(`${semester} 표를 초기화하시겠습니까?`)) return;
    const data = MasterSheet.getData();
    const other = data.rows.filter((r) => r.semester !== semester);
    const defaults = MasterSheet.defaultRows().filter((r) => r.semester === semester);
    data.rows = [...other, ...defaults.map((r) => ({ ...r, id: newId() }))];
    MasterSheet.save(data);
    renderRows(data.rows);
    showToast('초기화되었습니다.');
  }

  function deleteRow(btn) {
    const tr = btn.closest('tr');
    const tbody = tr.closest('tbody');
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    if (!confirm('이 행을 삭제하시겠습니까?')) return;
    const data = MasterSheet.getData();
    data.rows = data.rows.filter((r) => r.id !== tr.dataset.id);
    MasterSheet.save(data);
    tr.remove();
    showToast('삭제되었습니다.');
    document.dispatchEvent(new CustomEvent('master-updated'));
  }

  function downloadExcel() {
    ExcelIO.download(
      '행사마스터.xlsx',
      '행사마스터',
      ['학기', '월', '대상학년', '행사', '부서', '좋았던점', '보완점'],
      MasterSheet.toExportRowsEval()
    );
    showToast('Excel을 다운로드했습니다.');
  }

  function uploadExcel() {
    ExcelIO.upload((matrix) => {
      try {
        const count = MasterSheet.importFromRows(matrix, 'full');
        load();
        showToast(`${count}건이 반영되었습니다.`);
      } catch (e) {
        showToast(e.message || '업로드 실패');
      }
    });
  }

  function init() {
    load();
  }

  return { init, addRow, saveTable, resetTable, deleteRow, downloadExcel, uploadExcel, load };
})();
