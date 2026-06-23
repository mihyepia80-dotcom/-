function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
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

function setTodayDefault() {
  const today = new Date().toISOString().split('T')[0];
  ['f1-date', 'f2-date', 'f3-date', 'f-attach-date', 'f4-date', 'f5-date', 'f6-date'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  setTodayDefault();
  Form1.init();
  Form2.init();
  Form3.init();
  FormAttach.init();
  Form4.init();
  Form5.init();
  Form6.init();
});
