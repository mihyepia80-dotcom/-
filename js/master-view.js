/**
 * 월별 행사 확인 — 전체 목록 + 월/학년/키워드 검색
 */
const MasterView = (() => {
  const state = new Map();

  function filterRows(rows, { keyword = '', month = '', grade = '' } = {}) {
    const kw = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (month && r.month !== month) return false;
      if (grade && !String(r.grade).includes(grade)) return false;
      if (!kw) return true;
      const hay = [r.month, r.grade, r.activity, r.dept, r.semester].join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }

  function monthOptions() {
    const months = [...MasterSheet.SEMESTER1_MONTHS, ...MasterSheet.SEMESTER2_MONTHS];
    return months.map((m) => `<option value="${m}">${m}</option>`).join('');
  }

  function gradeOptions() {
    return [1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}학년">${g}학년</option>`).join('');
  }

  function mount(containerId) {
    const host = document.getElementById(containerId);
    if (!host) return;
    const wrap = host.closest('.master-view-wrap') || host.parentElement;
    if (!wrap.querySelector('.master-search-bar')) {
      const bar = document.createElement('div');
      bar.className = 'master-search-bar no-print';
      bar.innerHTML = `
        <input type="search" class="master-search-kw" placeholder="키워드 검색 (행사·부서)" aria-label="키워드" />
        <select class="master-search-month" aria-label="월">
          <option value="">전체 월</option>${monthOptions()}
        </select>
        <select class="master-search-grade" aria-label="학년">
          <option value="">전체 학년</option>${gradeOptions()}
        </select>
      `;
      wrap.insertBefore(bar, host);
      const update = debounce(() => render(containerId), 200);
      bar.querySelector('.master-search-kw').addEventListener('input', update);
      bar.querySelector('.master-search-month').addEventListener('change', () => render(containerId));
      bar.querySelector('.master-search-grade').addEventListener('change', () => render(containerId));
    }
    state.set(containerId, {});
    render(containerId);
  }

  function renderTableHtml(rows) {
    if (!rows.length) {
      return '<p class="master-empty">검색 결과가 없습니다.</p>';
    }
    const renderGroup = (title, semester) => {
      const group = rows.filter((r) => r.semester === semester);
      if (!group.length) return '';
      return `
        <h4 class="master-group-title">${title} <small>(${group.length}건)</small></h4>
        <table class="eval-table master-table">
          <thead><tr>
            <th>월</th><th>학년</th><th>행사</th><th>부서</th>
          </tr></thead>
          <tbody>${group
            .map(
              (r) => `<tr>
              <td>${esc(r.month)}</td>
              <td>${esc(r.grade).replace(/\n/g, '<br>')}</td>
              <td>${esc(r.activity).replace(/\n/g, '<br>')}</td>
              <td>${esc(r.dept).replace(/\n/g, '<br>')}</td>
            </tr>`
            )
            .join('')}</tbody>
        </table>`;
    };
    return renderGroup('1학기', '1학기') + renderGroup('2학기', '2학기');
  }

  function render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const wrap = el.closest('.master-view-wrap');
    const keyword = wrap?.querySelector('.master-search-kw')?.value || '';
    const month = wrap?.querySelector('.master-search-month')?.value || '';
    const grade = wrap?.querySelector('.master-search-grade')?.value || '';
    const rows = filterRows(MasterSheet.getRows(), { keyword, month, grade });
    el.innerHTML = `<p class="master-count">총 ${rows.length}건</p>${renderTableHtml(rows)}`;
  }

  function refreshAll() {
    document.querySelectorAll('.master-view[id]').forEach((el) => render(el.id));
  }

  /** 관리자 행사 검색 (form5 / admin) */
  function searchEvents({ keyword = '', month = '', grade = '', semester = '' } = {}) {
    let rows = MasterSheet.getRows();
    if (semester) rows = rows.filter((r) => r.semester === semester);
    return filterRows(rows, { keyword, month, grade });
  }

  return { mount, render, refreshAll, searchEvents, filterRows, renderTableHtml };
})();

function renderMasterTable(containerId) {
  MasterView.mount(containerId);
}
