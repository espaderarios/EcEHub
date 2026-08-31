/* EcE Hub — lightweight calendar-based study streaks */
(function installHomeStreaks() {
  const STORAGE_KEY = 'eceHubStudyDatesV1';
  let lastDateKey = '';
  let renderQueued = false;

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function readDates() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw.filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v)) : []);
    } catch (_) { return new Set(); }
  }

  function writeDates(dates) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dates].sort().slice(-180)));
  }

  function markTodayAsStudied() {
    const dates = readDates();
    dates.add(localDateKey());
    writeDates(dates);
    queueRender();
  }

  function getWeek() {
    const dates = readDates();
    const today = new Date();
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setHours(12, 0, 0, 0);
      date.setDate(today.getDate() - offset);
      days.push({ date, active: dates.has(localDateKey(date)), isToday: offset === 0 });
    }
    return days;
  }

  function render() {
    renderQueued = false;
    const week = document.querySelector('.home-week');
    if (!week) return;

    const days = getWeek();
    const completed = days.reduce((n, d) => n + (d.active ? 1 : 0), 0);
    const percent = Math.round((completed / 7) * 100);
    const html = days.map(d => {
      const label = d.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
      const title = d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const cls = `${d.active ? 'is-active ' : ''}${d.isToday ? 'is-today' : ''}`.trim();
      return `<span class="${cls}" title="${title}"><b>${label}</b><small>${d.date.getDate()}</small></span>`;
    }).join('');

    if (week.dataset.streakMarkup !== html) {
      week.innerHTML = html;
      week.dataset.streakMarkup = html;
    }

    const number = document.querySelector('.home-streak-number');
    if (number) number.innerHTML = `${completed}<span>/ 7 days</span>`;
    const percentEl = document.querySelector('.home-percent');
    if (percentEl) percentEl.textContent = `${percent}%`;
    const progress = document.querySelector('.goal-progress i');
    if (progress) progress.style.width = `${percent}%`;

    const heroStat = document.querySelector('.home-hero-stat strong');
    if (heroStat) heroStat.textContent = `${completed}/7`;
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  document.addEventListener('click', event => {
    const el = event.target.closest?.('[data-action]');
    if (!el) return;
    const action = String(el.getAttribute('data-action') || '').toLowerCase();
    if (action.includes('study')) markTodayAsStudied();
  });

  // Do not use MutationObserver here. The app is a SPA, and observing the
  // entire body makes navigation unnecessarily expensive. Instead, render
  // when the route settles and only once when the calendar is present.
  let lastWeekElement = null;
  function checkHome() {
    const week = document.querySelector('.home-week');
    if (week && week !== lastWeekElement) {
      lastWeekElement = week;
      render();
    }
  }

  window.addEventListener('hashchange', () => setTimeout(checkHome, 0));
  document.addEventListener('click', () => setTimeout(checkHome, 0));
  setTimeout(checkHome, 0);

  // Only check once per minute for a date rollover; no DOM observer needed.
  setInterval(() => {
    const key = localDateKey();
    if (key !== lastDateKey) {
      lastDateKey = key;
      lastWeekElement = null;
      checkHome();
    }
  }, 60000);
})();
