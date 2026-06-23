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
