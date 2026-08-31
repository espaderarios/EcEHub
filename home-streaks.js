/* EcE Hub — unified study streak system */
(function installUnifiedStudyStreaks() {
  const STORAGE_KEY = 'eceHubStudyDatesV2';
  const LEGACY_KEY = 'eceHubStudyDatesV1';
  let lastWeekElement = null;
  let lastRenderedKey = '';
  let lastDateKey = localDateKey();
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
    } catch (_) {
      return new Set();
    }
  }

  function migrateLegacyDates() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
      if (Array.isArray(legacy) && legacy.length) {
        const valid = legacy.filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v));
        if (valid.length) localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(valid)].sort().slice(-365)));
      }
    } catch (_) {}
  }

  function saveDates(dates) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dates].sort().slice(-365)));
  }

  function markStudyDate(reason = 'study') {
    const dates = readDates();
    const today = localDateKey();
    if (!dates.has(today)) {
      dates.add(today);
      saveDates(dates);
    }
    window.dispatchEvent(new CustomEvent('ecehub:streak-updated', { detail: { date: today, reason } }));
    queueRender(true);
  }

  function getLastSevenDays() {
    const dates = readDates();
    const today = new Date();
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setHours(12, 0, 0, 0);
      date.setDate(today.getDate() - offset);
      days.push({
        date,
        key: localDateKey(date),
        active: dates.has(localDateKey(date)),
        isToday: offset === 0
      });
    }
    return days;
  }

  function getGoalData() {
    const days = getLastSevenDays();
    const completed = days.filter(d => d.active).length;
    return { completed, total: 7, percent: Math.round((completed / 7) * 100), days };
  }

  // One authoritative API for every study feature in EcE Hub.
  window.EcEHubStreak = {
    markStudy: markStudyDate,
    getData: getGoalData,
    getDates: () => [...readDates()],
    today: () => localDateKey()
  };

  // The Home renderer asks for this function. Make it use the same source as
  // the calendar instead of maintaining a second streak database.
  window.getStudyGoalData = function unifiedGetStudyGoalData() {
    const goal = getGoalData();
    return { completed: goal.completed, total: goal.total, percent: goal.percent };
  };

  function render() {
    renderQueued = false;
    const week = document.querySelector('.home-week');
    if (!week) return;

    const goal = getGoalData();
    const markupKey = goal.days.map(d => `${d.key}:${d.active ? 1 : 0}:${d.isToday ? 1 : 0}`).join('|');
    if (markupKey === lastRenderedKey && week === lastWeekElement) return;

    week.innerHTML = goal.days.map(d => {
      const label = d.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
      const title = d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const cls = `${d.active ? 'is-active ' : ''}${d.isToday ? 'is-today' : ''}`.trim();
      return `<span class="${cls}" title="${title}"><b>${label}</b><small>${d.date.getDate()}</small></span>`;
    }).join('');

    const number = document.querySelector('.home-streak-number');
    if (number) number.innerHTML = `${goal.completed}<span>/ 7 days</span>`;
    const percent = document.querySelector('.home-percent');
    if (percent) percent.textContent = `${goal.percent}%`;
    const progress = document.querySelector('.goal-progress i');
    if (progress) progress.style.width = `${goal.percent}%`;
    const hero = document.querySelector('.home-hero-stat strong');
    if (hero) hero.textContent = `${goal.completed}/7`;

    lastWeekElement = week;
    lastRenderedKey = markupKey;
  }

  function queueRender(force = false) {
    if (force) lastRenderedKey = '';
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  migrateLegacyDates();

  // Explicit study event: future study tools can call
  // window.EcEHubStreak.markStudy('flashcards') without knowing storage details.
  window.addEventListener('ecehub:study', event => {
    markStudyDate(event.detail?.reason || 'study');
  });

  // Compatibility bridge for the existing UI while the individual study
  // views are migrated to the explicit API. Only genuine study actions count.
  document.addEventListener('click', event => {
    const el = event.target.closest?.('[data-action]');
    if (!el) return;
    const action = String(el.getAttribute('data-action') || '').toLowerCase();
    const text = String(el.textContent || '').trim().toLowerCase();
    if (/^(study|start-study|study-set|start-quiz|take-quiz|circuit-challenge)/.test(action) || /^(study now|start studying|start quiz|take quiz)$/.test(text)) {
      markStudyDate(action || text);
    }
    setTimeout(checkHome, 0);
  });

  function checkHome() {
    const week = document.querySelector('.home-week');
    if (week && week !== lastWeekElement) {
      lastWeekElement = week;
      lastRenderedKey = '';
      render();
    }
  }

  window.addEventListener('hashchange', () => setTimeout(checkHome, 0));
  window.addEventListener('ecehub:streak-updated', () => queueRender(true));
  setTimeout(checkHome, 0);

  setInterval(() => {
    const today = localDateKey();
    if (today !== lastDateKey) {
      lastDateKey = today;
      lastWeekElement = null;
      lastRenderedKey = '';
      checkHome();
    }
  }, 60000);
})();
