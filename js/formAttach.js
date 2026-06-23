const FormAttach = (() => {
  const STORAGE_KEY = 'midterm-form-attach';
  const GRADES = ['1학년', '2학년', '3학년'];
  const ROW_COUNT = 8;

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function defaultData() {
    const data = {};
    GRADES.forEach((g) => {
      data[g] = Array.from({ length: ROW_COUNT }, () => ({ content: '' }));
    });
    return data;
  }

  function getActiveGrade() {
    return document.querySelector('.grade-tab-btn.active')?.dataset.grade || GRADES[0];
  }

  function renderRows(grade, rows) {
    const tbody = document.getElementById('form-attach-body');
    tbody.innerHTML = '';
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${i + 1}</td>
        <td>
          <textarea class="cell-textarea attach-content" rows="3"
            placeholder="교사·학부모 및 기타 내용 — 좋았던 점 or 보완이 필요한 점">${esc(row.content)}</textarea>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function getRows() {
    const rows = [];
    document.querySelectorAll('#form-attach-body .attach-content').forEach((el) => {
      rows.push({ content: el.value });
    });
    return rows;
  }

  function save() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let data = defaultData();
    if (raw) {
      try { data = { ...data, ...JSON.parse(raw) }; } catch { /* keep default */ }
    }
    data[getActiveGrade()] = getRows();
    data._date = document.getElementById('f-attach-date').value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('첨부 양식이 저장되었습니다.');
  }

  function loadGrade(grade) {
    const raw = localStorage.getItem(STORAGE_KEY);
    let data = defaultData();
    if (raw) {
      try { data = { ...defaultData(), ...JSON.parse(raw) }; } catch { /* keep default */ }
    }
    document.getElementById('f-attach-date').value = data._date || new Date().toISOString().split('T')[0];
    renderRows(grade, data[grade] || defaultData()[grade]);
  }

  function switchGrade(grade) {
    save();
    document.querySelectorAll('.grade-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.grade === grade);
    });
    loadGrade(grade);
  }

  function reset() {
    if (!confirm('현재 학년의 첨부 양식을 초기화하시겠습니까?')) return;
    const grade = getActiveGrade();
    const raw = localStorage.getItem(STORAGE_KEY);
    let data = defaultData();
    if (raw) {
      try { data = JSON.parse(raw); } catch { /* keep default */ }
    }
    data[grade] = Array.from({ length: ROW_COUNT }, () => ({ content: '' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    loadGrade(grade);
    showToast('초기화되었습니다.');
  }

  function init() {
    document.querySelectorAll('.grade-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchGrade(btn.dataset.grade));
    });
    document.getElementById('f-attach-date').addEventListener('change', save);
    document.getElementById('form-attach-body').addEventListener('input', debounce(save, 800));
    loadGrade(GRADES[0]);
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return { init, save, reset };
})();
