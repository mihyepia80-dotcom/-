const Form2 = (() => {
  const STORAGE_KEY = 'midterm-form2';
  const DEFAULT_TASK_COUNT = 9;

  function emptyTask() {
    return {
      title: '',
      detail: '',
      period: '',
      quantitative: '',
      qualitative: '',
      plan: '',
    };
  }

  function defaultTasks() {
    return Array.from({ length: DEFAULT_TASK_COUNT }, () => emptyTask());
  }

  function createTaskCard(task = {}, index) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.index = index;

    card.innerHTML = `
      <div class="task-card-header">
        <h4>■ 주요 업무 ${index + 1}</h4>
        <button type="button" class="btn btn-danger no-print" onclick="Form2.removeTask(this)">삭제</button>
      </div>
      <div class="task-card-body">
        <div class="task-field full-width">
          <label>주요 업무명</label>
          <input type="text" class="task-title" value="${esc(task.title)}" placeholder="주요 업무명을 입력하세요" />
        </div>
        <div class="task-field">
          <label>세부업무</label>
          <textarea class="task-detail" rows="2" placeholder="세부업무">${esc(task.detail)}</textarea>
        </div>
        <div class="task-field">
          <label>추진기간</label>
          <input type="text" class="task-period" value="${esc(task.period)}" placeholder="예: 3월~6월" />
        </div>
        <div class="task-field">
          <label>정량적 추진결과(횟수 등)</label>
          <textarea class="task-quantitative" rows="2" placeholder="횟수, 건수 등">${esc(task.quantitative)}</textarea>
        </div>
        <div class="task-field">
          <label>정성적 추진결과</label>
          <textarea class="task-qualitative" rows="2" placeholder="정성적 결과">${esc(task.qualitative)}</textarea>
        </div>
        <div class="task-field full-width">
          <label>2학기 계획</label>
          <textarea class="task-plan" rows="2" placeholder="2학기 계획">${esc(task.plan)}</textarea>
        </div>
      </div>
    `;
    return card;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function syncHeaderFields() {
    const area = document.getElementById('f2-area').value;
    const person = document.getElementById('f2-person').value;
    document.getElementById('f2-area-cell').value = area;
    document.getElementById('f2-person-cell').value = person;
    document.getElementById('f2-area-print').textContent = area;
    document.getElementById('f2-person-print').textContent = person;
  }

  function getTasks() {
    const tasks = [];
    document.querySelectorAll('#form2-tasks .task-card').forEach((card) => {
      tasks.push({
        title: card.querySelector('.task-title').value,
        detail: card.querySelector('.task-detail').value,
        period: card.querySelector('.task-period').value,
        quantitative: card.querySelector('.task-quantitative').value,
        qualitative: card.querySelector('.task-qualitative').value,
        plan: card.querySelector('.task-plan').value,
      });
    });
    return tasks;
  }

  function renderTasks(tasks) {
    const container = document.getElementById('form2-tasks');
    container.innerHTML = '';
    tasks.forEach((task, i) => container.appendChild(createTaskCard(task, i)));
  }

  function save() {
    syncHeaderFields();
    const data = {
      area: document.getElementById('f2-area').value,
      person: document.getElementById('f2-person').value,
      date: document.getElementById('f2-date').value,
      workContent: document.getElementById('f2-work-content').value,
      tasks: getTasks(),
      other: document.getElementById('f2-other').value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('서식 2가 저장되었습니다.');
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      renderTasks(defaultTasks());
      return;
    }
    try {
      const data = JSON.parse(raw);
      document.getElementById('f2-area').value = data.area || '';
      document.getElementById('f2-person').value = data.person || '';
      document.getElementById('f2-date').value = data.date || '';
      document.getElementById('f2-work-content').value = data.workContent || '';
      document.getElementById('f2-other').value = data.other || '';
      renderTasks(data.tasks?.length ? data.tasks : defaultTasks());
      syncHeaderFields();
    } catch {
      renderTasks(defaultTasks());
    }
  }

  function addTask() {
    const container = document.getElementById('form2-tasks');
    container.appendChild(createTaskCard(emptyTask(), container.children.length));
  }

  function removeTask(btn) {
    const container = document.getElementById('form2-tasks');
    if (container.children.length <= 1) {
      showToast('최소 1개 업무는 유지해야 합니다.');
      return;
    }
    btn.closest('.task-card').remove();
    container.querySelectorAll('.task-card').forEach((card, i) => {
      card.querySelector('h4').textContent = `■ 주요 업무 ${i + 1}`;
    });
    save();
  }

  function reset() {
    if (!confirm('서식 2의 모든 내용을 초기화하시겠습니까?')) return;
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('f2-area').value = '';
    document.getElementById('f2-person').value = '';
    document.getElementById('f2-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('f2-work-content').value = '';
    document.getElementById('f2-other').value = '';
    renderTasks(defaultTasks());
    syncHeaderFields();
    showToast('서식 2가 초기화되었습니다.');
  }

  function init() {
    load();
    ['f2-area', 'f2-person', 'f2-date', 'f2-area-cell', 'f2-person-cell', 'f2-work-content', 'f2-other'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', debounce(save, 800));
    });
    document.getElementById('f2-area').addEventListener('input', () => {
      document.getElementById('f2-area-cell').value = document.getElementById('f2-area').value;
    });
    document.getElementById('f2-person').addEventListener('input', () => {
      document.getElementById('f2-person-cell').value = document.getElementById('f2-person').value;
    });
    document.getElementById('form2-tasks').addEventListener('input', debounce(save, 800));
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return { init, addTask, removeTask, save, reset };
})();
