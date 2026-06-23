const Form4 = (() => {
  const STORAGE_KEY = 'midterm-form4';
  const CATEGORIES = [
    { id: 'self', label: '본인', rows: 1 },
    { id: 'host', label: '주관', rows: 1 },
    { id: 'event', label: '행사', rows: 1 },
    { id: 'work', label: '업무', rows: 1 },
  ];
  const EXTRA_ROWS = 8;

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function satRadios(name, value) {
    return [5, 4, 3, 2, 1]
      .map((n) => `
        <label>
          <input type="radio" name="${name}" value="${n}" ${value == n ? 'checked' : ''} />
          ${n}
        </label>`)
      .join('');
  }

  function createEvalRow(data = {}, catId, rowIdx) {
    const name = `f4-sat-${catId}-${rowIdx}`;
    const tr = document.createElement('tr');
    tr.dataset.cat = catId;
    tr.innerHTML = `
      <td><textarea class="cell-textarea target-input" rows="2" placeholder="학년 또는 교사">${esc(data.target)}</textarea></td>
      <td><textarea class="cell-textarea program-input" rows="2" placeholder="프로그램 내용">${esc(data.program)}</textarea></td>
      <td><div class="satisfaction-group">${satRadios(name, data.satisfaction)}</div></td>
      <td><textarea class="cell-textarea reason-input" rows="2" placeholder="좋았던 점 or 보완이 필요한 점">${esc(data.reason)}</textarea></td>
      <td class="no-print"><button type="button" class="btn btn-danger" onclick="Form4.removeEvalRow(this)">×</button></td>
    `;
    return tr;
  }

  function renderEvalTable(saved) {
    const tbody = document.getElementById('form4-eval-body');
    tbody.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      const catRows = saved?.eval?.[cat.id] || [{ target: '', program: '', satisfaction: '', reason: '' }];
      catRows.forEach((row, i) => {
        const tr = createEvalRow(row, cat.id, i);
        if (i === 0) {
          const td = document.createElement('td');
          td.className = 'category-cell';
          td.rowSpan = catRows.length;
          td.textContent = cat.label;
          tr.prepend(td);
        }
        tbody.appendChild(tr);
      });
    });
  }

  function renderExtraRows(saved) {
    const tbody = document.getElementById('form4-extra-body');
    tbody.innerHTML = '';
    const rows = saved?.extra || Array.from({ length: EXTRA_ROWS }, () => ({ content: '' }));
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${i + 1}</td>
        <td><textarea class="cell-textarea extra-content" rows="3"
          placeholder="교사·학부모 및 기타 내용 — 좋았던 점 or 보완이 필요한 점">${esc(row.content)}</textarea></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function getEvalData() {
    const evalData = {};
    CATEGORIES.forEach((cat) => {
      evalData[cat.id] = [];
      document.querySelectorAll(`#form4-eval-body tr[data-cat="${cat.id}"]`).forEach((tr) => {
        const checked = tr.querySelector('input[type="radio"]:checked');
        evalData[cat.id].push({
          target: tr.querySelector('.target-input').value,
          program: tr.querySelector('.program-input').value,
          satisfaction: checked ? checked.value : '',
          reason: tr.querySelector('.reason-input').value,
        });
      });
    });
    return evalData;
  }

  function getExtraData() {
    return Array.from(document.querySelectorAll('#form4-extra-body .extra-content')).map((el) => ({
      content: el.value,
    }));
  }

  function save() {
    const data = {
      writer: document.getElementById('f4-writer').value,
      date: document.getElementById('f4-date').value,
      eval: getEvalData(),
      extra: getExtraData(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('서식 4가 저장되었습니다.');
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      renderEvalTable(null);
      renderExtraRows(null);
      return;
    }
    try {
      const data = JSON.parse(raw);
      document.getElementById('f4-writer').value = data.writer || '';
      document.getElementById('f4-date').value = data.date || new Date().toISOString().split('T')[0];
      renderEvalTable(data);
      renderExtraRows(data);
    } catch {
      renderEvalTable(null);
      renderExtraRows(null);
    }
  }

  function addEvalRow(catId) {
    const tbody = document.getElementById('form4-eval-body');
    const catRows = tbody.querySelectorAll(`tr[data-cat="${catId}"]`);
    const idx = catRows.length;
    const tr = createEvalRow({}, catId, idx);
    if (catRows.length > 0) {
      const firstRow = catRows[0];
      const catCell = firstRow.querySelector('.category-cell');
      if (catCell) catCell.rowSpan = idx + 1;
    } else {
      const td = document.createElement('td');
      td.className = 'category-cell';
      td.textContent = CATEGORIES.find((c) => c.id === catId)?.label || '';
      tr.prepend(td);
    }
    const last = catRows[catRows.length - 1];
    last ? last.after(tr) : tbody.appendChild(tr);
    save();
  }

  function removeEvalRow(btn) {
    const tr = btn.closest('tr');
    const catId = tr.dataset.cat;
    const tbody = document.getElementById('form4-eval-body');
    const catRows = tbody.querySelectorAll(`tr[data-cat="${catId}"]`);
    if (catRows.length <= 1) {
      showToast('각 구분별 최소 1개 행은 유지해야 합니다.');
      return;
    }
    const isFirst = tr.querySelector('.category-cell');
    tr.remove();
    const remaining = tbody.querySelectorAll(`tr[data-cat="${catId}"]`);
    if (isFirst && remaining.length > 0) {
      const newFirst = remaining[0];
      const td = document.createElement('td');
      td.className = 'category-cell';
      td.rowSpan = remaining.length;
      td.textContent = CATEGORIES.find((c) => c.id === catId)?.label || '';
      newFirst.prepend(td);
    } else if (remaining.length > 0) {
      const catCell = remaining[0].querySelector('.category-cell');
      if (catCell) catCell.rowSpan = remaining.length;
    }
    remaining.forEach((row, i) => {
      row.querySelectorAll('input[type="radio"]').forEach((r) => {
        r.name = `f4-sat-${catId}-${i}`;
      });
    });
    save();
  }

  function reset() {
    if (!confirm('서식 4의 모든 내용을 초기화하시겠습니까?')) return;
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('f4-writer').value = '';
    document.getElementById('f4-date').value = new Date().toISOString().split('T')[0];
    renderEvalTable(null);
    renderExtraRows(null);
    showToast('서식 4가 초기화되었습니다.');
  }

  function init() {
    load();
    ['f4-writer', 'f4-date'].forEach((id) => {
      document.getElementById(id).addEventListener('change', save);
    });
    document.getElementById('form4-eval-body').addEventListener('input', debounce(save, 800));
    document.getElementById('form4-eval-body').addEventListener('change', debounce(save, 800));
    document.getElementById('form4-extra-body').addEventListener('input', debounce(save, 800));
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return { init, save, reset, addEvalRow, removeEvalRow };
})();
