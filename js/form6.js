const Form6 = (() => {
  const STORAGE_KEY = 'midterm-form6';

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function createDeptTable(dept, savedRows) {
    if (dept.special) {
      const saved = savedRows?.result || '';
      return `
        <div class="dept-special">
          <p class="dept-special-title">${esc(dept.description)}</p>
          <p class="dept-special-detail">${esc(dept.detail)}</p>
          <div class="dept-special-result">
            <label>1학기 업무추진결과 및 2학기 계획</label>
            <textarea class="dept-result-input" data-dept="${dept.id}" rows="6"
              placeholder="업무추진결과 및 2학기 계획을 입력하세요">${esc(saved)}</textarea>
          </div>
        </div>`;
    }

    const rows = savedRows || dept.rows.map((r) => ({
      category: r.category,
      person: r.person,
      work: r.work,
      result: r.resultTemplate || '',
    }));

    const bodyRows = rows.map((row, i) => `
      <tr data-dept="${dept.id}" data-row="${i}">
        <td class="category-col"><textarea class="cell-textarea cat-input" rows="3">${esc(row.category)}</textarea></td>
        <td><input type="text" class="cell-input person-input" value="${esc(row.person)}" /></td>
        <td><textarea class="cell-textarea work-input" rows="4">${esc(row.work)}</textarea></td>
        <td><textarea class="cell-textarea result-input" rows="6">${esc(row.result)}</textarea></td>
        <td class="no-print"><button type="button" class="btn btn-danger" onclick="Form6.removeRow('${dept.id}', ${i})">×</button></td>
      </tr>
    `).join('');

    return `
      <div class="table-wrap">
        <table class="eval-table dept-table">
          <thead>
            <tr>
              <th class="col-category">계</th>
              <th class="col-person">담당자</th>
              <th class="col-work">업 무 내 용</th>
              <th class="col-plan">1학기 업무추진결과 및 2학기 계획</th>
              <th class="col-action no-print">삭제</th>
            </tr>
          </thead>
          <tbody id="form6-body-${dept.id}">${bodyRows}</tbody>
        </table>
      </div>
      <div class="dept-actions no-print">
        <button type="button" class="btn btn-secondary" onclick="Form6.addRow('${dept.id}')">행 추가</button>
      </div>`;
  }

  function render() {
    const container = document.getElementById('form6-departments');
    const saved = loadAll();
    container.innerHTML = DEPARTMENTS.map((dept) => `
      <div class="dept-section" id="dept-${dept.id}" data-dept="${dept.id}">
        <h3 class="dept-title">${esc(dept.name)}</h3>
        ${createDeptTable(dept, saved[dept.id])}
      </div>
    `).join('');
  }

  function loadAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw).departments || {}; } catch { return {}; }
  }

  function getDeptRows(deptId) {
    const dept = DEPARTMENTS.find((d) => d.id === deptId);
    if (dept?.special) {
      const el = document.querySelector(`.dept-result-input[data-dept="${deptId}"]`);
      return { result: el?.value || '' };
    }
    const rows = [];
    document.querySelectorAll(`#form6-body-${deptId} tr`).forEach((tr) => {
      rows.push({
        category: tr.querySelector('.cat-input')?.value || '',
        person: tr.querySelector('.person-input')?.value || '',
        work: tr.querySelector('.work-input')?.value || '',
        result: tr.querySelector('.result-input')?.value || '',
      });
    });
    return rows;
  }

  function save() {
    const departments = {};
    DEPARTMENTS.forEach((dept) => {
      departments[dept.id] = getDeptRows(dept.id);
    });
    const data = {
      date: document.getElementById('f6-date').value,
      departments,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('서식 6이 저장되었습니다.');
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        document.getElementById('f6-date').value = data.date || new Date().toISOString().split('T')[0];
      } catch { /* ignore */ }
    }
    render();
  }

  function scrollToDept(deptId) {
    document.querySelectorAll('.dept-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.dept === deptId);
    });
    const el = document.getElementById(`dept-${deptId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addRow(deptId) {
    const tbody = document.getElementById(`form6-body-${deptId}`);
    if (!tbody) return;
    const i = tbody.children.length;
    const tr = document.createElement('tr');
    tr.dataset.dept = deptId;
    tr.dataset.row = i;
    tr.innerHTML = `
      <td class="category-col"><textarea class="cell-textarea cat-input" rows="3"></textarea></td>
      <td><input type="text" class="cell-input person-input" /></td>
      <td><textarea class="cell-textarea work-input" rows="4"></textarea></td>
      <td><textarea class="cell-textarea result-input" rows="6">■ </textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger" onclick="Form6.removeRow('${deptId}', ${i})">×</button></td>
    `;
    tbody.appendChild(tr);
    save();
  }

  function removeRow(deptId, rowIdx) {
    const rows = getDeptRows(deptId);
    if (!Array.isArray(rows) || rows.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    rows.splice(rowIdx, 1);
    const departments = {};
    DEPARTMENTS.forEach((dept) => {
      departments[dept.id] = dept.id === deptId ? rows : getDeptRows(dept.id);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: document.getElementById('f6-date').value,
      departments,
    }));
    render();
    showToast('행이 삭제되었습니다.');
  }

  function reset() {
    if (!confirm('서식 6의 모든 부서 데이터를 초기화하시겠습니까?')) return;
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('f6-date').value = new Date().toISOString().split('T')[0];
    render();
    showToast('서식 6이 초기화되었습니다.');
  }

  function init() {
    load();
    document.getElementById('f6-date').addEventListener('change', save);
    document.getElementById('form6-departments').addEventListener('input', debounce(save, 800));

    const nav = document.getElementById('form6-dept-nav');
    nav.innerHTML = DEPARTMENTS.map((d) => `
      <button type="button" class="dept-nav-btn" data-dept="${d.id}" onclick="Form6.scrollToDept('${d.id}')">${esc(d.name.replace(/^\d+\)\s*/, ''))}</button>
    `).join('');
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return { init, save, reset, addRow, removeRow, scrollToDept };
})();
