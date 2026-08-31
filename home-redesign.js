/* EcE Hub Home — redesigned dashboard layer */
(function installHomeRedesign() {
  function getGreeting() {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }

  function updateHomeGreeting() {
    const greetingEl = document.querySelector('[data-home-greeting]');
    if (greetingEl) greetingEl.textContent = getGreeting();
  }

  function renderHome() {
    const cards = data.sets.reduce((n, s) => n + (Array.isArray(s.cards) ? s.cards.length : 0), 0);
    const latestSet = data.sets[0] || null;
    const firstName = String(data.profile?.name || 'Student').trim().split(/\s+/)[0] || 'Student';
    const goal = typeof getStudyGoalData === 'function' ? getStudyGoalData() : { completed: 0 };

    const activity = data.activity?.length
      ? data.activity.slice(0, 5).map(a => `
        <div class="home-activity-item">
          <div class="home-activity-icon">✓</div>
          <div class="home-activity-copy"><strong>${esc(a.text)}</strong><span>${esc(a.sub)}</span></div>
          <time>${esc(a.time)}</time>
        </div>`).join('')
      : `<div class="home-empty-state"><div class="home-empty-icon">⌁</div><strong>Your activity will appear here</strong><p>Study a set, take a quiz, or explore a tool to get started.</p></div>`;

    const classes = data.classes?.length
      ? data.classes.slice(0, 4).map(classCard).join('')
      : `<div class="home-empty-state home-empty-wide"><div class="home-empty-icon">⌘</div><div><strong>No classes added yet</strong><p>Add your subjects to keep your academic workspace organized.</p></div><button class="btn primary" data-action="add-class">Add class</button></div>`;

    return `
      <section class="home-hero">
        <div class="home-hero-copy">
          <span class="home-eyebrow">EcE HUB · ACADEMIC WORKSPACE</span>
          <h1><span data-home-greeting>${getGreeting()}</span>, ${esc(firstName)} <span>👋</span></h1>
          <p>${esc(data.profile?.course || 'Your academic workspace')} · Everything you need to study, practice, and keep moving.</p>
        </div>
        <div class="home-hero-meta">
          <div class="home-hero-stat"><strong>${goal.completed}/7</strong><span>study days</span></div>
          <div class="home-hero-divider"></div>
          <div class="home-hero-stat"><strong>${data.sets.length}</strong><span>study sets</span></div>
        </div>
      </section>

      <section class="home-quick-grid" aria-label="Quick actions">
        <button type="button" class="home-quick-card" data-action="continue-study"><span class="home-quick-icon">▧</span><span class="home-quick-copy"><strong>${latestSet ? 'Continue studying' : 'Start studying'}</strong><small>${latestSet ? 'Pick up your latest set' : 'Open your study sets'}</small></span><span class="home-quick-arrow">→</span></button>
        <button type="button" class="home-quick-card" data-action="classes"><span class="home-quick-icon">⌘</span><span class="home-quick-copy"><strong>My classes</strong><small>View subjects & progress</small></span><span class="home-quick-arrow">→</span></button>
        <button type="button" class="home-quick-card" data-action="open-ai-flashcard-maker"><span class="home-quick-icon">✦</span><span class="home-quick-copy"><strong>AI flashcards</strong><small>Create a study set</small></span><span class="home-quick-arrow">→</span></button>
        <button type="button" class="home-quick-card" data-action="open-circuit-challenge"><span class="home-quick-icon">⌁</span><span class="home-quick-copy"><strong>Circuit challenge</strong><small>Practice problem solving</small></span><span class="home-quick-arrow">→</span></button>
      </section>

      <div class="grid stats home-stats">
        <div class="card stat home-stat-card">${cardIcon('purple', '⌘')}<div><strong>${data.classes.length}</strong><span>Subjects</span><small>Active subjects</small></div></div>
        <div class="card stat home-stat-card">${cardIcon('green', '▰')}<div><strong>${data.sets.length}</strong><span>Study Sets</span><small>Your flashcard sets</small></div></div>
        <div class="card stat home-stat-card">${cardIcon('blue', '▤')}<div><strong>${cards}</strong><span>Flashcards</span><small>Total cards</small></div></div>
        <div class="card stat home-stat-card">${cardIcon('orange', '♛')}<div><strong>${data.quizzes.length}</strong><span>Quizzes</span><small>Available now</small></div></div>
      </div>

      <div class="home-dashboard-grid">
        <div class="home-main-column">
          <section class="home-section">
            <div class="section-head home-section-head"><div><h2>Pick up where you left off</h2><p>Jump straight back into your current study flow.</p></div></div>
            <div class="home-continue-card card ${latestSet ? '' : 'is-empty'}" data-action="continue-study">
              <div class="home-continue-glow"></div><div class="home-continue-icon">${latestSet ? '▧' : '+'}</div>
              <div class="home-continue-copy"><span class="home-card-kicker">${latestSet ? 'LATEST STUDY SET' : 'READY TO START'}</span><h3>${latestSet ? esc(latestSet.title) : 'Create your first study set'}</h3><p>${latestSet ? `${esc(latestSet.subject || 'General')} · ${Array.isArray(latestSet.cards) ? latestSet.cards.length : 0} cards` : 'Build a set manually or use the AI flashcard maker.'}</p></div>
              <span class="home-continue-action">${latestSet ? 'Study now →' : 'Get started →'}</span>
            </div>
          </section>

          <section class="home-section">
            <div class="section-head home-section-head"><div><h2>My Classes</h2><p>Your subjects at a glance.</p></div><button class="btn" data-action="classes">View all</button></div>
            <div class="grid class-grid">${classes}</div>
          </section>
        </div>

        <aside class="home-side-column">
          <section class="card home-panel"><div class="section-head home-section-head"><div><h2>Study streak</h2><p>Keep your momentum going.</p></div><span class="home-percent">${Math.min(100, Math.round((goal.completed / 7) * 100))}%</span></div><div class="home-streak-number">${goal.completed}<span>/ 7 days</span></div><div class="goal-progress"><i style="width:${Math.min(100, (goal.completed / 7) * 100)}%"></i></div><div class="home-week"><span class="is-active">M</span><span class="is-active">T</span><span>W</span><span>Th</span><span>F</span><span>S</span><span>S</span></div></section>
          <section class="card home-panel"><div class="section-head home-section-head"><div><h2>Recent activity</h2><p>Your latest study actions.</p></div></div><div class="home-activity-list">${activity}</div></section>
        </aside>
      </div>

      <div class="home-grid home-community-anchor" aria-hidden="true"></div>
    `;
  }

  window.homeView = renderHome;

  // Keep the greeting correct even if the user leaves EcE Hub open across noon or 6 PM.
  setInterval(() => {
    if (typeof currentView === 'string' && currentView === 'home') updateHomeGreeting();
  }, 60000);
})();
