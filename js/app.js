function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function initMainTabs() {
  const tabs = document.querySelectorAll('.tab-nav.main-nav > .tab-btn');
  const panels = document.querySelectorAll('.form-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        const isActive = panel.id === target;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

function initSubTabs(navId, panelSelector) {
  const nav = document.getElementById(navId);
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.sub-tab-add');
    if (addBtn) return;

    const btn = e.target.closest('.sub-tab-btn');
    if (!btn || btn.classList.contains('sub-tab-add')) return;

    const target = btn.dataset.target;
    nav.querySelectorAll('.sub-tab-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    const container = nav.closest('.form-panel') || document;
    container.querySelectorAll(panelSelector).forEach((panel) => {
      const isActive = panel.id === target || panel.dataset.target === target;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });

    nav.dispatchEvent(new CustomEvent('subtab-change', { detail: { target, btn } }));
  });
}

function setTodayDefault() {
  const today = todayStr();
  document.querySelectorAll('input[type="date"]').forEach((el) => {
    if (!el.value) el.value = today;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initMainTabs();
  setTodayDefault();
  await CloudSync.init();
  if (typeof TemplateStore !== 'undefined') {
    await TemplateStore.fetchFromCloud().catch(() => {});
  }
  FormGrade.init();
  Form4.init();
  Form5.init();
  Form6.init();
});
