const Form3 = (() => {
  const STORAGE_KEY = 'midterm-form3';
  const MONTHS = ['3월', '4월', '5월', '6월', '7월'];

  function defaultRows() {
    return MONTHS.map((month) => ({
      month,
      grade: '',
      content: '',
      satisfaction: '',
      reason: '',
    }));
  }

  function createRow(data = {}, index) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    const satOptions = [5, 4, 3, 2, 1]
      .map(
        (n) => `
        <label>
          <input type="radio" name="sat-${index}" value="${n}" ${data.satisfaction == n ? 'checked' : ''} />
          ${n}
        </label>`
      )
      .join('');

    tr.innerHTML = `
      <td>
        <select class="cell-select month-select">
          ${['3월', '4월', '5월', '6월', '7월', '기타'].map(
            (m) => `<option value="${m}" ${data.month === m ? 'selected' : ''}>${m}</option>`
          ).join('')}
        </select>
      </td>
      <td><textarea class="cell-textarea grade-input" rows="2" placeholder="예: 1학년 (1시간)">${esc(data.grade || '')}</textarea></td>
      <td><textarea class="cell-textarea content-input" rows="3" placeholder="교육활동 내용">${esc(data.content || '')}</textarea></td>
      <td>
        <div class="satisfaction-group">
          ${satOptions}
        </div>
      </td>
      <td><textarea class="cell-textarea reason-input" rows="3" placeholder="좋았던 점 또는 보완이 필요한 점">${esc(data.reason || '')}</textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger" onclick="Form3.removeRow(this)">×</button></td>
    `;
    return tr;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getRows() {
    const rows = [];
    document.querySelectorAll('#form3-body tr').forEach((tr, index) => {
      const checked = tr.querySelector(`input[name="sat-${index}"]:checked`);
      rows.push({
        month: tr.querySelector('.month-select').value,
        grade: tr.querySelector('.grade-input').value,
        content: tr.querySelector('.content-input').value,
        satisfaction: checked ? checked.value : '',
        reason: tr.querySelector('.reason-input').value,
      });
    });
    return rows;
  }

  function renderRows(rows) {
    const tbody = document.getElementById('form3-body');
    tbody.innerHTML = '';
    rows.forEach((row, i) => tbody.appendChild(createRow(row, i)));
  }

  function save() {
    const data = {
      grade: document.getElementById('f3-grade').value,
      date: document.getElementById('f3-date').value,
      attendees: document.getElementById('f3-attendees').value,
      rows: getRows(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('서식 3이 저장되었습니다.');
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      renderRows(defaultRows());
      return;
    }
    try {
      const data = JSON.parse(raw);
      document.getElementById('f3-grade').value = data.grade || '';
      document.getElementById('f3-date').value = data.date || '';
      document.getElementById('f3-attendees').value = data.attendees || '';
      renderRows(data.rows?.length ? data.rows : defaultRows());
    } catch {
      renderRows(defaultRows());
    }
  }

  function addRow() {
    const tbody = document.getElementById('form3-body');
    tbody.appendChild(createRow({}, tbody.children.length));
  }

  function removeRow(btn) {
    const tbody = document.getElementById('form3-body');
    if (tbody.children.length <= 1) {
      showToast('최소 1개 행은 유지해야 합니다.');
      return;
    }
    btn.closest('tr').remove();
    renderRows(getRows());
    save();
  }

  function reset() {
    if (!confirm('서식 3의 모든 내용을 초기화하시겠습니까?')) return;
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('f3-grade').value = '';
    document.getElementById('f3-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('f3-attendees').value = '';
    renderRows(defaultRows());
    showToast('서식 3이 초기화되었습니다.');
  }

  function init() {
    load();
    ['f3-grade', 'f3-date', 'f3-attendees'].forEach((id) => {
      document.getElementById(id).addEventListener('change', save);
    });
    document.getElementById('form3-body').addEventListener('input', debounce(save, 800));
    document.getElementById('form3-body').addEventListener('change', debounce(save, 800));
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
