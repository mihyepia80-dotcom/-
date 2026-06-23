function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function satisfactionRadios(name, value) {
  return [5, 4, 3, 2, 1]
    .map(
      (n) => `
      <label>
        <input type="radio" name="${name}" value="${n}" ${value == n ? 'checked' : ''} />
        ${n}
      </label>`
    )
    .join('');
}

function monthSelectOptions(selected, semester = '1학기') {
  const months = semester === '2학기' ? MasterSheet.SEMESTER2_MONTHS : MasterSheet.SEMESTER1_MONTHS;
  return months.map((m) => `<option value="${m}" ${selected === m ? 'selected' : ''}>${m}</option>`).join('');
}

function namesMatch(stored, input) {
  const a = String(stored ?? '').trim().replace(/\s/g, '');
  const b = String(input ?? '').trim().replace(/\s/g, '');
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const RESULT_TEMPLATE = `■ (좋았던 점)

■ (보완할 점)`;

const TASK_RESULT_TEMPLATE = `■ 주요 업무명
 - 세부업무: 
 - 추진기간: 
 - 정량적 추진결과(횟수 등): 
 - 정성적 추진결과:
 - 2학기 계획`;

const MASTER_HEADERS = ['학기', '월', '대상학년(참여시간)', '주요 교육활동(행사)', '부서(담당)'];

function defaultTask() {
  return { id: newId(), content: TASK_RESULT_TEMPLATE };
}

function defaultTasks(isOther = false) {
  return isOther ? [{ id: newId(), content: '' }] : [defaultTask()];
}

function renderMasterTable(containerId, filterGrade = null) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let rows = MasterSheet.getRows();
  if (filterGrade) {
    rows = rows.filter((r) => String(r.grade).includes(`${filterGrade}학년`) || !r.grade);
  }

  if (!rows.length) {
    el.innerHTML = '<p class="master-empty">마스터 시트에 등록된 행사가 없습니다.</p>';
    return;
  }

  const renderGroup = (title, semester) => {
    const group = rows.filter((r) => r.semester === semester);
    if (!group.length) return '';
    return `
      <h4 class="master-group-title">${title}</h4>
      <table class="eval-table master-table">
        <thead>
          <tr>
            <th class="col-month">월</th>
            <th class="col-grade">대상학년<br><small>(참여시간)</small></th>
            <th class="col-activity">주요 교육활동(행사)</th>
            <th class="col-dept">부서(담당)</th>
          </tr>
        </thead>
        <tbody>
          ${group
            .map(
              (r) => `
            <tr>
              <td>${esc(r.month)}</td>
              <td>${esc(r.grade).replace(/\n/g, '<br>')}</td>
              <td>${esc(r.activity).replace(/\n/g, '<br>')}</td>
              <td>${esc(r.dept).replace(/\n/g, '<br>')}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  };

  el.innerHTML = renderGroup('1학기 (3~7월)', '1학기') + renderGroup('2학기 (8~1월)', '2학기');
}

function triggerFileInput(accept, onFile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}
