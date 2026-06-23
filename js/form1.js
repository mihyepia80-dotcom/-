const Form1 = (() => {
  const STORAGE_KEY = 'midterm-form1';
  const MONTHS = ['3월', '4월', '5월', '6월', '7월'];

  const defaultRows = () =>
    MONTHS.map((month) => ({
      month,
      grade: month === '3월' ? '1학년\n(1시간)' : '',
      activity: month === '3월' ? '개학식 및 입학식' : '',
      dept: month === '3월' ? '교무부장,\n1학년' : '',
      goodPoints: '',
      improvePoints: '',
    }));

  function createRow(data = {}, index) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    tr.innerHTML = `
      <td>
        <select class="cell-select month-select">
          ${['3월', '4월', '5월', '6월', '7월', '기타'].map(
            (m) => `<option value="${m}" ${data.month === m ? 'selected' : ''}>${m}</option>`
          ).join('')}
        </select>
      </td>
      <td><textarea class="cell-textarea grade-input" rows="2" placeholder="예: 1학년&#10;(1시간)">${esc(data.grade || '')}</textarea></td>
      <td><textarea class="cell-textarea activity-input" rows="2" placeholder="주요 교육활동">${esc(data.activity || '')}</textarea></td>
      <td><textarea class="cell-textarea dept-input" rows="2" placeholder="부서(담당)">${esc(data.dept || '')}</textarea></td>
      <td>
        <div class="result-fields">
          <div class="result-field">
            <label>■ (좋았던 점)</label>
            <textarea class="good-input" rows="2">${esc(data.goodPoints || '')}</textarea>
          </div>
          <div class="result-field">
            <label>■ (보완할 점)</label>
            <textarea class="improve-input" rows="2">${esc(data.improvePoints || '')}</textarea>
          </div>
        </div>
      </td>
      <td class="no-print"><button type="button" class="btn btn-danger" onclick="Form1.removeRow(this)">×</button></td>
    `;
    return tr;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getRows() {
    const rows = [];
    document.querySelectorAll('#form1-body tr').forEach((tr) => {
      rows.push({
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

  function renderRows(rows) {
    const tbody = document.getElementById('form1-body');
    tbody.innerHTML = '';
    rows.forEach((row, i) => tbody.appendChild(createRow(row, i)));
  }

  function save() {
    const data = {
      department: document.getElementById('f1-department').value,
      writer: document.getElementById('f1-writer').value,
      date: document.getElementById('f1-date').value,
      rows: getRows(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('서식 1이 저장되었습니다.');
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      renderRows(defaultRows());
      return;
    }
    try {
      const data = JSON.parse(raw);
      document.getElementById('f1-department').value = data.department || '';
      document.getElementById('f1-writer').value = data.writer || '';
      document.getElementById('f1-date').value = data.date || '';
      renderRows(data.rows?.length ? data.rows : defaultRows());
    } catch {
      renderRows(defaultRows());
    }
  }

  function addRow() {
    const tbody = document.getElementById('form1-body');
    tbody.appendChild(createRow({}, tbody.children.length));
  }

  function removeRow(btn) {
    const tbody = document.getElementById('form1-body');
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    btn.closest('tr').remove();
  }

  function reset() {
    if (!confirm('서식 1의 모든 내용을 초기화하시겠습니까?')) return;
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('f1-department').value = '';
    document.getElementById('f1-writer').value = '';
    document.getElementById('f1-date').value = new Date().toISOString().split('T')[0];
    renderRows(defaultRows());
    showToast('서식 1이 초기화되었습니다.');
  }

  function init() {
    load();
    ['f1-department', 'f1-writer', 'f1-date'].forEach((id) => {
      document.getElementById(id).addEventListener('change', save);
    });
    document.getElementById('form1-body').addEventListener('input', debounce(save, 800));
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return { init, addRow, removeRow, save, reset };
})();
