const Form6 = (() => {
  const STORAGE_KEY = 'midterm-form6';
  const DEPT_EVENT_PATTERNS = {
    gyomu: /교무|전재우|서유나|장임실|김이경|입학|학적|임원|삼릉통신/i,
    saenghwal: /생활|인성|상담|유채빈|김향미|박희현|박신옥|멘토링|알뜰/i,
    jiro: /진로|장명진|이향아|안전|소방|교통/i,
    neulbom: /늘봄|돌봄|방과후|맞춤형/i,
    yeongu: /연구|도서|기초학력|특수|영어|사서|AI|디벗|장학|교과서/i,
    munhwa: /문예|체육|음악|악기|운동|수영|탈춤|예술/i,
    gwahak: /과학|정보|방송|환경|컴퓨터|디벗|센스쿨/i,
    grade6: /6학년|졸업|중입/i,
  };
  let activeDeptId = DEPARTMENTS[0].id;
  let viewerName = '';
  let store = { rowData: {}, customRows: {} };

  function deptTabLabel(dept) {
    return dept.name.replace(/^\d+\)\s*/, '');
  }

  function baseRowKey(deptId, index) {
    return `${deptId}-${index}`;
  }

  function emptyStore() {
    return { rowData: {}, customRows: {} };
  }

  function getRowState(key, isOther = false) {
    if (!store.rowData[key]) {
      store.rowData[key] = { tasks: defaultTasks(isOther), updatedAt: '' };
    } else {
      store.rowData[key].tasks = (store.rowData[key].tasks || []).map(normalizeTask);
    }
    return store.rowData[key];
  }

  function deptEventsFor(dept) {
    const pattern = DEPT_EVENT_PATTERNS[dept.id];
    if (!pattern) return [];
    return MasterSheet.getRows().filter((r) => {
      const hay = `${r.dept} ${r.activity} ${r.goodPoints}`;
      return pattern.test(hay);
    });
  }

  function deptEventReviewHtml(dept) {
    const rows = deptEventsFor(dept);
    if (!rows.length) {
      return '<p class="dept-event-empty no-print">연결된 학년 협의 행사가 없습니다.</p>';
    }
    const body = rows
      .slice(0, 12)
      .map(
        (r) => `<tr>
          <td>${esc(r.month)}</td>
          <td>${esc(r.grade).replace(/\n/g, '<br>')}</td>
          <td>${esc(r.activity).replace(/\n/g, '<br>')}</td>
          <td>${esc(r.goodPoints).replace(/\n/g, '<br>')}</td>
        </tr>`
      )
      .join('');
    return `
      <div class="dept-event-review">
        <h4 class="dept-subtitle">학년별 협의 반영 <small>(6.25 · ${rows.length}건)</small></h4>
        <div class="table-wrap">
          <table class="eval-table dept-event-table">
            <thead><tr>
              <th>월</th><th>대상학년</th><th>행사</th><th>학년별 의견·추진결과</th>
            </tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>`;
  }

  function getCustomRows(deptId) {
    if (!store.customRows[deptId]) store.customRows[deptId] = [];
    return store.customRows[deptId];
  }

  function buildShell() {
    const section = document.getElementById('form6');
    const subTabs = DEPARTMENTS.map(
      (dept) =>
        `<button type="button" class="sub-tab-btn${dept.id === activeDeptId ? ' active' : ''}"
          data-target="dept-panel-${dept.id}" data-dept-id="${dept.id}" role="tab"
          aria-selected="${dept.id === activeDeptId}">${esc(deptTabLabel(dept))}</button>`
    ).join('');

    section.innerHTML = `
      <div class="form-header form-header-main">
        <h2>부서별 협의록</h2>
        <p class="form-desc">6.25 학년별 협의를 반영하여 부서별 1학기 추진결과·2학기 계획을 작성합니다</p>
      </div>
      <nav class="sub-tab-nav" id="f6-subtabs" role="tablist">${subTabs}</nav>
      <div class="dept-toolbar no-print">
        <div class="meta-fields">
          <label>담당자 이름 <input type="text" id="f6-viewer-name" placeholder="본인 이름 입력 (예: 김이경)" /></label>
          <label>작성일 <input type="date" id="f6-date" /></label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="f6-add-person-btn" onclick="Form6.addPerson()">+ 담당자 추가</button>
          <button type="button" class="btn btn-outline" onclick="Form6.clearViewer()">전체 보기</button>
          <button type="button" class="btn btn-outline" onclick="Form6.exportExcel()">Excel 다운</button>
          <button type="button" class="btn btn-outline" onclick="window.print()">인쇄</button>
          ${typeof CloudSync !== 'undefined' ? CloudSync.loadBtnHtml('CloudSync.loadForm6()') : ''}
        </div>
      </div>
      <div id="f6-departments" class="dept-list"></div>
    `;
  }

  function taskBlockHtml(key, task, taskIndex, canDeleteTask) {
    const t = normalizeTask(task);
    return `
      <div class="task-block" data-task-id="${t.id}">
        <label class="task-title-label no-print">업무명
          <input type="text" class="task-title" data-key="${key}" data-task-id="${t.id}" value="${esc(t.title)}" placeholder="세부 업무명" />
        </label>
        <label class="task-content-label">1학기 업무추진결과 및 2학기 계획
          <textarea class="dept-result task-content" rows="8" data-key="${key}" data-task-id="${t.id}">${esc(t.content)}</textarea>
        </label>
        ${canDeleteTask ? `<button type="button" class="btn btn-danger btn-sm no-print task-del-btn" onclick="Form6.removeTask('${key}', '${t.id}')">업무 삭제</button>` : ''}
      </div>`;
  }

  function personCardHtml(key, meta, state) {
    const tasks = state.tasks?.length ? state.tasks : defaultTasks(meta.isOther);
    const canDeletePerson = meta.isCustom;
    const canDeleteTask = tasks.length > 1;

    return `
      <div class="person-card" data-row-key="${key}" data-person="${esc(meta.person)}" data-is-custom="${meta.isCustom ? '1' : '0'}">
        <div class="person-card-head">
          <div class="person-meta">
            <span class="person-category">${esc(meta.category).replace(/\n/g, ' · ')}</span>
            <span class="person-name">${esc(meta.person) || '(담당자 미지정)'}</span>
          </div>
          <div class="person-actions no-print">
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form6.addTask('${key}')">+ 업무</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="Form6.saveRow('${key}')">저장</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form6.resetRow('${key}')">초기화</button>
            ${canDeletePerson ? `<button type="button" class="btn btn-danger btn-sm" onclick="Form6.deleteRow('${key}')">삭제</button>` : ''}
          </div>
        </div>
        <div class="person-work">
          <span class="work-label">업무 내용 <small>(세부추진계획)</small></span>
          ${esc(meta.work).replace(/\n/g, '<br>')}
        </div>
        ${meta.isCustom ? `
          <div class="custom-fields no-print">
            <label>계 <input type="text" class="custom-category" value="${esc(meta.category)}" placeholder="업무영역" /></label>
            <label>담당자 <input type="text" class="custom-person" value="${esc(meta.person)}" placeholder="담당자 이름" /></label>
            <label>업무내용 <input type="text" class="custom-work" value="${esc(meta.work)}" placeholder="업무 내용" /></label>
          </div>` : ''}
        <h4 class="dept-result-title">1학기 업무추진결과 및 2학기 계획</h4>
        <div class="task-list">
          ${tasks.map((t, i) => taskBlockHtml(key, t, i, canDeleteTask)).join('')}
        </div>
        ${state.updatedAt ? `<p class="saved-at">마지막 저장: ${esc(state.updatedAt)}</p>` : ''}
      </div>`;
  }

  function createDeptSection(dept) {
    const section = document.createElement('div');
    section.className = 'dept-section sub-panel dept-panel';
    section.id = `dept-panel-${dept.id}`;
    section.dataset.deptId = dept.id;
    section.hidden = dept.id !== activeDeptId;

    if (dept.isSpecial) {
      const key = `${dept.id}-special`;
      const state = getRowState(key);
      section.innerHTML = `
        <h3 class="dept-title">${esc(dept.name)}</h3>
        <div class="special-dept person-card" data-row-key="${key}">
          <p class="special-label">${esc(dept.description)}</p>
          <p class="special-work">${esc(dept.work)}</p>
          <div class="person-actions no-print">
            <button type="button" class="btn btn-primary btn-sm" onclick="Form6.saveRow('${key}')">저장</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Form6.resetRow('${key}')">초기화</button>
          </div>
          <h4 class="dept-result-title">1학기 업무추진결과 및 2학기 계획</h4>
          <label class="task-title-label">업무명
            <input type="text" class="task-title" data-key="${key}" data-task-id="${state.tasks[0].id}" value="${esc(state.tasks[0].title || '')}" placeholder="업무명 (선택)" />
          </label>
          <label class="task-content-label">추진결과 · 2학기 계획
            <textarea class="dept-result special-result task-content" data-key="${key}" data-task-id="${state.tasks[0].id}" rows="8">${esc(state.tasks[0].content)}</textarea>
          </label>
          ${state.updatedAt ? `<p class="saved-at">마지막 저장: ${esc(state.updatedAt)}</p>` : ''}
        </div>`;
      return section;
    }

    const cards = [];
    dept.rows.forEach((row, i) => {
      const key = baseRowKey(dept.id, i);
      cards.push(
        personCardHtml(
          key,
          { category: row.category, person: row.person, work: row.work, isOther: row.isOther, isCustom: false },
          getRowState(key, row.isOther)
        )
      );
    });

    getCustomRows(dept.id).forEach((custom) => {
      cards.push(
        personCardHtml(
          custom.id,
          { category: custom.category, person: custom.person, work: custom.work, isCustom: true },
          getRowState(custom.id)
        )
      );
    });

      section.innerHTML = `
        <h3 class="dept-title">${esc(dept.name)}</h3>
        ${deptEventReviewHtml(dept)}
        <p class="dept-guide no-print">아래 표는 <strong>계 · 담당자 · 업무내용</strong>별로 1학기 추진결과와 2학기 계획을 작성합니다.</p>
        <p class="filter-hint no-print">${viewerName ? `「${esc(viewerName)}」님의 작성란` : '담당자 이름을 입력하면 본인 작성란만 표시됩니다.'}</p>
        <p class="filter-empty no-print" hidden>이 부서에 해당하는 담당자 작성란이 없습니다.</p>
        <div class="person-cards">${cards.join('')}</div>`;
    return section;
  }

  function applyPersonFilter() {
    const name = document.getElementById('f6-viewer-name')?.value?.trim() || '';
    viewerName = name;

    document.querySelectorAll('.dept-panel').forEach((panel) => {
      const cards = panel.querySelectorAll('.person-card[data-row-key]');
      let visibleCount = 0;
      cards.forEach((card) => {
        const person = card.dataset.person || '';
        const show = !name || (person.trim() && namesMatch(person, name));
        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      const special = panel.querySelector('.special-dept');
      if (special) special.hidden = !!name;

      const hint = panel.querySelector('.filter-hint');
      const empty = panel.querySelector('.filter-empty');
      if (hint) {
        hint.textContent = name ? `「${name}」님의 작성란` : '담당자 이름을 입력하면 본인 작성란만 표시됩니다.';
      }
      if (empty) {
        empty.hidden = !name || visibleCount > 0 || !!panel.querySelector('.special-dept:not([hidden])');
      }
    });

    const addBtn = document.getElementById('f6-add-person-btn');
    if (addBtn) addBtn.hidden = !!name;
  }

  function clearViewer() {
    const input = document.getElementById('f6-viewer-name');
    if (input) input.value = '';
    viewerName = '';
    applyPersonFilter();
    persistStore();
  }

  function readCardFromDOM(key) {
    const card = document.querySelector(`.person-card[data-row-key="${key}"]`);
    if (!card) return null;

    const tasks = [];
    const blocks = card.querySelectorAll('.task-block');
    if (blocks.length) {
      blocks.forEach((block) => {
        const id = block.dataset.taskId || block.querySelector('.task-content')?.dataset.taskId || newId();
        tasks.push({
          id,
          title: block.querySelector('.task-title')?.value || '',
          content: block.querySelector('.task-content')?.value || '',
        });
      });
    } else {
      const contentEl = card.querySelector('.task-content');
      if (contentEl) {
        tasks.push({
          id: contentEl.dataset.taskId || newId(),
          title: card.querySelector('.task-title')?.value || '',
          content: contentEl.value || '',
        });
      }
    }

    const isCustom = card.dataset.isCustom === '1';
    const state = { tasks, updatedAt: store.rowData[key]?.updatedAt || '' };

    if (isCustom) {
      const custom = getCustomRows(activeDeptId).find((c) => c.id === key);
      if (custom) {
        custom.category = card.querySelector('.custom-category')?.value || '';
        custom.person = card.querySelector('.custom-person')?.value || '';
        custom.work = card.querySelector('.custom-work')?.value || '';
      }
    }

    return state;
  }

  function syncFromDOM() {
    document.querySelectorAll('.person-card[data-row-key]').forEach((card) => {
      const key = card.dataset.rowKey;
      const state = readCardFromDOM(key);
      if (state) store.rowData[key] = state;
    });
  }

  function persistStore() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeDeptId,
        viewerName: document.getElementById('f6-viewer-name')?.value?.trim() || '',
        date: document.getElementById('f6-date')?.value || '',
        rowData: store.rowData,
        customRows: store.customRows,
      })
    );
  }

  function renderDepts() {
    const container = document.getElementById('f6-departments');
    container.innerHTML = '';
    DEPARTMENTS.forEach((dept) => container.appendChild(createDeptSection(dept)));
    bindCustomFieldListeners();
    bindTaskListeners();
    applyPersonFilter();
  }

  function bindTaskListeners() {
    document.querySelectorAll('.task-content, .task-title').forEach((el) => {
      el.addEventListener('input', debounce(() => {
        syncFromDOM();
        persistStore();
      }, 800));
    });
  }

  function bindCustomFieldListeners() {
    document.querySelectorAll('.custom-person, .custom-category, .custom-work').forEach((el) => {
      el.addEventListener('input', debounce(() => {
        const card = el.closest('.person-card');
        const nameEl = card.querySelector('.person-name');
        if (nameEl && el.classList.contains('custom-person')) {
          nameEl.textContent = el.value.trim() || '(담당자 미지정)';
          card.dataset.person = el.value.trim();
        }
        syncFromDOM();
        persistStore();
      }, 300));
    });
  }

  function switchDept(deptId) {
    activeDeptId = deptId;
    document.querySelectorAll('.dept-panel').forEach((panel) => {
      panel.hidden = panel.dataset.deptId !== deptId;
    });
    document.querySelectorAll('#f6-subtabs .sub-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.deptId === deptId);
      btn.setAttribute('aria-selected', btn.dataset.deptId === deptId ? 'true' : 'false');
    });
  }

  function applyCloudData(data) {
    if (!data?.store) return;
    store = {
      rowData: data.store.rowData || {},
      customRows: data.store.customRows || {},
    };
    Object.values(store.rowData).forEach((state) => {
      if (state.tasks) state.tasks = state.tasks.map(normalizeTask);
    });
    if (data.viewerName) {
      viewerName = data.viewerName;
      const nameInput = document.getElementById('f6-viewer-name');
      if (nameInput) nameInput.value = viewerName;
    }
    if (data.deptId && DEPARTMENTS.some((d) => d.id === data.deptId)) {
      activeDeptId = data.deptId;
    }
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
    applyPersonFilter();
  }

  async function saveRow(key) {
    syncFromDOM();
    const state = store.rowData[key];
    if (state) state.updatedAt = new Date().toLocaleString('ko-KR');
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
    const synced = await CloudSync.syncForm6();
    showToast(`저장되었습니다.${CloudSync.cloudHint(synced)}`);
  }

  function resetRow(key) {
    if (!confirm('이 담당자의 업무 내용을 초기화하시겠습니까?')) return;
    syncFromDOM();
    const dept = DEPARTMENTS.find((d) => d.id === activeDeptId);
    let isOther = false;
    if (dept && !dept.isSpecial) {
      const idx = dept.rows.findIndex((_, i) => baseRowKey(dept.id, i) === key);
      if (idx >= 0) isOther = !!dept.rows[idx].isOther;
    }
    store.rowData[key] = { tasks: defaultTasks(isOther), updatedAt: '' };
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
    showToast('초기화되었습니다.');
  }

  function deleteRow(key) {
    if (!confirm('이 담당자 행을 삭제하시겠습니까?')) return;
    syncFromDOM();
    store.customRows[activeDeptId] = getCustomRows(activeDeptId).filter((c) => c.id !== key);
    delete store.rowData[key];
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
    showToast('삭제되었습니다.');
  }

  function addTask(key) {
    syncFromDOM();
    const state = getRowState(key);
    state.tasks.push(defaultTask());
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
  }

  function removeTask(key, taskId) {
    syncFromDOM();
    const state = getRowState(key);
    if (state.tasks.length <= 1) {
      showToast('최소 1개 업무는 유지해야 합니다.');
      return;
    }
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
  }

  function addPerson() {
    syncFromDOM();
    const id = `${activeDeptId}-custom-${newId()}`;
    getCustomRows(activeDeptId).push({
      id,
      category: '',
      person: '',
      work: '',
    });
    store.rowData[id] = { tasks: defaultTasks(), updatedAt: '' };
    persistStore();
    renderDepts();
    switchDept(activeDeptId);
    showToast('담당자 칸이 추가되었습니다.');
  }

  function exportExcel(deptId = activeDeptId) {
    syncFromDOM();
    const dept = DEPARTMENTS.find((d) => d.id === deptId);
    if (!dept) return;
    const rows = [];

    dept.rows.forEach((row, i) => {
      const key = baseRowKey(dept.id, i);
      const state = store.rowData[key] || { tasks: [] };
      state.tasks.forEach((task, ti) => {
        rows.push([row.category.replace(/\n/g, ' '), row.person, row.work, task.title || `업무${ti + 1}`, task.content]);
      });
    });

    getCustomRows(dept.id).forEach((custom) => {
      const state = store.rowData[custom.id] || { tasks: [] };
      state.tasks.forEach((task, ti) => {
        rows.push([custom.category, custom.person, custom.work, task.title || `업무${ti + 1}`, task.content]);
      });
    });

    if (dept.isSpecial) {
      const key = `${dept.id}-special`;
      const state = store.rowData[key];
      if (state?.tasks?.[0]) {
        rows.push([dept.description, '', dept.work, '업무1', state.tasks[0].content]);
      }
    }

    ExcelIO.download(
      `${deptTabLabel(dept)}_협의록.xlsx`,
      deptTabLabel(dept),
      ['계', '담당자', '업무내용', '세부업무', '추진결과 및 2학기 계획'],
      rows
    );
    showToast('Excel 파일을 다운로드했습니다.');
  }

  function migrateLegacy(data) {
    if (data.rowData) {
      Object.values(data.rowData).forEach((state) => {
        if (state.tasks) state.tasks = state.tasks.map(normalizeTask);
      });
      return data;
    }
    const rowData = {};
    Object.entries(data.results || {}).forEach(([key, content]) => {
      rowData[key] = {
        tasks: [{ id: newId(), content: String(content) }],
        updatedAt: '',
      };
    });
    return { ...data, rowData, customRows: data.customRows || {} };
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    activeDeptId = DEPARTMENTS[0].id;
    store = emptyStore();

    if (raw) {
      try {
        const data = migrateLegacy(JSON.parse(raw));
        activeDeptId = data.activeDeptId && DEPARTMENTS.some((d) => d.id === data.activeDeptId) ? data.activeDeptId : DEPARTMENTS[0].id;
        store.rowData = data.rowData || {};
        store.customRows = data.customRows || {};
        viewerName = data.viewerName || '';
      } catch {
        store = emptyStore();
      }
    }

    buildShell();
    if (raw) {
      try {
        const data = JSON.parse(raw);
        document.getElementById('f6-date').value = data.date || todayStr();
        const nameInput = document.getElementById('f6-viewer-name');
        if (nameInput) nameInput.value = data.viewerName || viewerName || '';
      } catch {
        /* ignore */
      }
    }

    DEPARTMENTS.forEach((dept) => {
      if (!dept.isSpecial) {
        dept.rows.forEach((row, i) => getRowState(baseRowKey(dept.id, i), row.isOther));
      } else {
        getRowState(`${dept.id}-special`);
      }
    });

    renderDepts();
    switchDept(activeDeptId);

    document.getElementById('f6-date').addEventListener('change', persistStore);
    const nameInput = document.getElementById('f6-viewer-name');
    nameInput.addEventListener('input', debounce(() => {
      applyPersonFilter();
      persistStore();
    }, 300));
    initSubTabs('f6-subtabs', '.dept-panel');
    document.getElementById('f6-subtabs').addEventListener('subtab-change', (e) => {
      syncFromDOM();
      persistStore();
      const deptId = e.detail.btn?.dataset.deptId;
      if (deptId) {
        activeDeptId = deptId;
        switchDept(deptId);
        applyPersonFilter();
      }
    });
    document.addEventListener('master-updated', () => {
      syncFromDOM();
      renderDepts();
      switchDept(activeDeptId);
    });
  }

  function init() {
    load();
  }

  return {
    init,
    saveRow,
    resetRow,
    deleteRow,
    addTask,
    removeTask,
    addPerson,
    exportExcel,
    clearViewer,
    persistStore,
    syncFromDOM,
    getStore: () => store,
    getActiveDeptId: () => activeDeptId,
    applyCloudData,
  };
})();
