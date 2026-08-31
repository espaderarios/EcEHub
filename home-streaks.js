/* EcE Hub — real calendar-based study streaks */
(function installHomeStreaks() {
  const STORAGE_KEY = 'eceHubStudyDatesV1';
  const MAX_DAYS = 180;

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
    } catch (_) {
      return new Set();
    }
  }

  function writeDates(dates) {
    const sorted = [...dates].sort().slice(-MAX_DAYS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }

  function markTodayAsStudied() {
    const dates = readDates();
    dates.add(localDateKey());
    writeDates(dates);
    render();
  }

  function daysForLastSeven() {
    const dates = readDates();
    const today = new Date();
    const result = [];

    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setHours(12, 0, 0, 0);
      day.setDate(today.getDate() - offset);
      result.push({
        date: day,
        key: localDateKey(day),
        active: dates.has(localDateKey(day)),
        isToday: offset === 0
      });
    }
    return result;
  }

  function render() {
    const week = document.querySelector('.home-week');
    if (!week) return;

    const days = daysForLastSeven();
    const completed = days.filter(d => d.active).length;
    const percent = Math.min(100, Math.round((completed / 7) * 100));

    const number = document.querySelector('.home-streak-number');
    if (number) number.innerHTML = `${completed}<span>/ 7 days</span>`;

    const percentEl = document.querySelector('.home-percent');
    if (percentEl) percentEl.textContent = `${percent}%`;

    const progress = document.querySelector('.goal-progress i');
    if (progress) progress.style.width = `${percent}%`;

    week.innerHTML = days.map(d => {
      const label = d.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
      const dayNumber = d.date.getDate();
      const classes = [d.active ? 'is-active' : '', d.isToday ? 'is-today' : ''].filter(Boolean).join(' ');
      return `<span class="${classes}" title="${d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}"><b>${label}</b><small>${dayNumber}</small></span>`;
    }).join('');

    // Keep the Home hero's weekly study-day count consistent with the calendar.
    const heroStats = document.querySelectorAll('.home-hero-stat strong');
    if (heroStats.length) heroStats[0].textContent = `${completed}/7`;
  }

  // Study actions are the source of truth: opening a study session marks that
  // calendar day as studied. Other actions are intentionally ignored.
  document.addEventListener('click', event => {
    const actionEl = event.target.closest?.('[data-action]');
    if (!actionEl) return;
    const action = String(actionEl.getAttribute('data-action') || '').toLowerCase();
    if (action.includes('study')) markTodayAsStudied();
  }, true);

  // Render whenever the SPA changes the Home DOM.
  const observer = new MutationObserver(() => {
    if (document.querySelector('.home-week')) render();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(render, 60000);
  setTimeout(render, 0);
})();
