/* EcE Hub — Global live search */
(function installGlobalLiveSearch() {
  const input = document.getElementById('globalSearch');
  const panel = document.getElementById('searchResults');
  const content = document.getElementById('content');

  if (!input || !panel || !content) return;

  const state = {
    query: '',
    requestId: 0,
    timer: null,
    controller: null,
    community: { users: [], flashcards: [] }
  };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const text = value => String(value ?? '').trim();
  const lower = value => text(value).toLocaleLowerCase();

  function score(item, query) {
    const q = lower(query);
    if (!q) return 0;

    const title = lower(item.title);
    const subject = lower(item.subject);
    const description = lower(item.description);
    const username = lower(item.username);
    const displayName = lower(item.displayName);
    const haystack = `${title} ${subject} ${description} ${username} ${displayName}`;

    let value = 0;
    if (title === q) value += 1000;
    else if (title.startsWith(q)) value += 650;
    else if (title.includes(q)) value += 450;
    if (subject === q) value += 350;
    else if (subject.startsWith(q)) value += 220;
    else if (subject.includes(q)) value += 150;
    if (username === q) value += 900;
    else if (username.startsWith(q)) value += 600;
    else if (username.includes(q)) value += 350;
    if (displayName === q) value += 850;
    else if (displayName.startsWith(q)) value += 550;
    else if (displayName.includes(q)) value += 300;
    if (description.includes(q)) value += 80;

    for (const word of q.split(/\s+/).filter(Boolean)) {
      if (haystack.includes(word)) value += 20;
    }

    return value;
  }

  function localResults(query) {
    const q = lower(query);
    if (!q) return { books: [], workspace: [], builtin: [], notes: [], quizzes: [] };

    const books = Array.isArray(data?.books) ? data.books : [];
    const sets = Array.isArray(data?.sets) ? data.sets : [];
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    const quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
    const builtins = Array.isArray(BUILTIN_FLASHCARDS) ? BUILTIN_FLASHCARDS : [];

    const match = (item, fields) => fields.some(field => lower(field).includes(q));

    return {
      books: books
        .filter(book => match(book, [book.title, book.course, book.subject, book.author, book.description]))
        .map(book => ({ ...book, _score: score({ title: book.title, subject: book.course || book.subject, description: book.description }, query) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 20),

      workspace: sets
        .filter(set => match(set, [set.title, set.subject, set.description]))
        .map(set => ({ ...set, _score: score(set, query) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 20),

      builtin: builtins
        .filter(set => match(set, [set.title, set.subject, set.description]))
        .map(set => ({ ...set, _score: score(set, query) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 20),

      notes: notes
        .filter(note => match(note, [note.title, note.subject, note.content, note.text, note.body]))
        .map(note => ({ ...note, _score: score({ title: note.title, subject: note.subject, description: note.content || note.text || note.body }, query) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 20),

      quizzes: quizzes
        .filter(quiz => match(quiz, [quiz.title, quiz.subject, quiz.description]))
        .map(quiz => ({ ...quiz, _score: score(quiz, query) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 20)
    };
  }

  function allResults(query) {
    const local = localResults(query);
    const communityFlashcards = (state.community.flashcards || [])
      .map(item => ({ ...item, _score: score(item, query) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 20);
    const users = (state.community.users || [])
      .map(item => ({ ...item, _score: score(item, query) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 20);

    return { ...local, communityFlashcards, users };
  }

  function totalCount(results) {
    return Object.values(results).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  }

  function icon(type) {
    return ({ books: '▤', workspace: '▧', builtin: '▧⃞', communityFlashcards: '▧', users: '◉', notes: '☑', quizzes: '◈' })[type] || '•';
  }

  function typeLabel(type) {
    return ({ books: 'Book / PDF', workspace: 'Workspace flashcard', builtin: 'Built-in flashcard', communityFlashcards: 'Community flashcard', users: 'Community member', notes: 'Note', quizzes: 'Quiz' })[type] || 'Result';
  }

  function itemTitle(type, item) {
    if (type === 'users') return item.displayName || item.username || 'Community member';
    return item.title || 'Untitled';
  }

  function itemMeta(type, item) {
    if (type === 'users') return `@${text(item.username)}`;
    if (type === 'books') return text(item.course || item.subject || 'PDF');
    if (type === 'workspace' || type === 'builtin' || type === 'communityFlashcards') {
      const subject = text(item.subject || 'General');
      const count = type === 'communityFlashcards'
        ? Number(item.cardCount || (Array.isArray(item.cards) ? item.cards.length : 0))
        : Number(Array.isArray(item.cards) ? item.cards.length : 0);
      return `${subject} · ${count} card${count === 1 ? '' : 's'}`;
    }
    if (type === 'notes') return text(item.subject || 'Note');
    if (type === 'quizzes') {
      const count = Array.isArray(item.questions) ? item.questions.length : 0;
      return `${text(item.subject || 'Quiz')}${count ? ` · ${count} question${count === 1 ? '' : 's'}` : ''}`;
    }
    return '';
  }

  function actionAttrs(type, item) {
    const id = esc(item.id || '');
    if (type === 'books' && item.driveUrl) return `data-search-open-book="${esc(item.driveUrl)}"`;
    if (type === 'communityFlashcards') return `data-action="view-community-set" data-id="${id}"`;
    if (type === 'workspace') return `data-route="flashcards" data-search-id="${id}"`;
    if (type === 'builtin') return `data-route="builtin-flashcards" data-search-id="${id}"`;
    if (type === 'notes') return `data-route="notes" data-search-id="${id}"`;
    if (type === 'quizzes') return `data-route="quizzes" data-search-id="${id}"`;
    return '';
  }

  function renderRow(type, item) {
    const title = esc(itemTitle(type, item));
    const meta = esc(itemMeta(type, item));
    const action = actionAttrs(type, item);
    const avatar = type === 'users' && item.avatarUrl
      ? `<img src="${esc(item.avatarUrl)}" alt="" loading="lazy">`
      : icon(type);

    return `
      <button type="button" class="global-search-row" ${action}>
        <span class="global-search-row-icon ${type}">${avatar}</span>
        <span class="global-search-row-copy">
          <strong>${title}</strong>
          <small>${meta || typeLabel(type)}</small>
        </span>
        <span class="global-search-row-type">${esc(typeLabel(type))}</span>
      </button>`;
  }

  function orderedSections(results) {
    return [
      ['communityFlashcards', results.communityFlashcards],
      ['books', results.books],
      ['workspace', results.workspace],
      ['builtin', results.builtin],
      ['users', results.users],
      ['notes', results.notes],
      ['quizzes', results.quizzes]
    ];
  }

  function renderDropdown(results, query, loading = false) {
    if (!query) {
      panel.innerHTML = '';
      panel.hidden = true;
      return;
    }

    const sections = orderedSections(results)
      .filter(([, items]) => items.length)
      .slice(0, 4);

    if (loading && !sections.length) {
      panel.innerHTML = `<div class="global-search-status">Searching EcE Hub…</div>`;
      panel.hidden = false;
      return;
    }

    if (!sections.length) {
      panel.innerHTML = `<div class="global-search-status">No results for <strong>${esc(query)}</strong></div>`;
      panel.hidden = false;
      return;
    }

    panel.innerHTML = `
      <div class="global-search-dropdown-head">
        <span>Results for “${esc(query)}”</span>
        <span>${totalCount(results)} found</span>
      </div>
      ${sections.map(([type, items]) => `
        <div class="global-search-group">
          <div class="global-search-group-title">${esc(typeLabel(type))}</div>
          ${items.slice(0, 3).map(item => renderRow(type, item)).join('')}
        </div>
      `).join('')}
      ${totalCount(results) > 12 ? '<div class="global-search-more">More results appear below</div>' : ''}`;

    panel.hidden = false;
  }

  function renderSearchHome(results, query, loading = false) {
    if (route !== 'home') return;

    if (!query) {
      if (typeof render === 'function') render();
      return;
    }

    const sections = orderedSections(results).filter(([, items]) => items.length);
    const count = totalCount(results);

    content.innerHTML = `
      <div class="global-search-page">
        <div class="global-search-page-header">
          <div>
            <div class="global-search-eyebrow">ECe HUB SEARCH</div>
            <h1>Search results</h1>
            <p>${loading ? 'Searching…' : `${count} result${count === 1 ? '' : 's'} for`} <strong>“${esc(query)}”</strong></p>
          </div>
          <button type="button" class="btn" data-search-clear-page>Clear search</button>
        </div>

        <div class="global-search-filters" role="tablist" aria-label="Search categories">
          <button type="button" class="active" data-search-filter="all">All</button>
          <button type="button" data-search-filter="books">Books</button>
          <button type="button" data-search-filter="flashcards">Flashcards</button>
          <button type="button" data-search-filter="users">People</button>
          <button type="button" data-search-filter="notes">Notes</button>
          <button type="button" data-search-filter="quizzes">Quizzes</button>
        </div>

        ${loading && !sections.length ? `<div class="global-search-loading card"><span class="global-search-spinner"></span> Searching EcE Hub…</div>` : ''}

        ${sections.length ? sections.map(([type, items]) => `
          <section class="global-search-section" data-search-section="${type}">
            <div class="global-search-section-head">
              <div>
                <span class="global-search-section-icon">${icon(type)}</span>
                <h2>${esc(typeLabel(type))}</h2>
              </div>
              <span>${items.length}</span>
            </div>
            <div class="global-search-results-grid">
              ${items.slice(0, 12).map(item => renderCard(type, item)).join('')}
            </div>
          </section>
        `).join('') : (!loading ? `
          <div class="global-search-empty card">
            <div class="global-search-empty-icon">⌕</div>
            <h2>No results found</h2>
            <p>Try a different title, subject, username, or keyword.</p>
          </div>
        ` : '')}

        <section id="homeCommunityFlashcards" style="display:none" aria-hidden="true"></section>
      </div>`;

    installFilters();
  }

  function renderCard(type, item) {
    const title = esc(itemTitle(type, item));
    const meta = esc(itemMeta(type, item));
    const action = actionAttrs(type, item);
    const description = type === 'books'
      ? text(item.author || item.description || 'PDF resource')
      : type === 'users'
        ? text(item.bio || `@${item.username || ''}`)
        : type === 'notes'
          ? text(item.content || item.text || item.body || '')
          : type === 'communityFlashcards' || type === 'workspace' || type === 'builtin'
            ? text(item.description || '')
            : text(item.description || '');

    return `
      <article class="global-search-card card">
        <button type="button" class="global-search-card-hit" ${action}>
          <div class="global-search-card-top">
            <span class="global-search-card-icon ${type}">${type === 'users' && item.avatarUrl ? `<img src="${esc(item.avatarUrl)}" alt="" loading="lazy">` : icon(type)}</span>
            <span class="global-search-card-kind">${esc(typeLabel(type))}</span>
          </div>
          <h3>${title}</h3>
          <div class="global-search-card-meta">${meta}</div>
          ${description ? `<p>${esc(description.slice(0, 180))}${description.length > 180 ? '…' : ''}</p>` : ''}
        </button>
        ${type === 'communityFlashcards' ? `
          <div class="global-search-card-actions">
            <button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(item.id || '')}">Study</button>
            <button type="button" class="btn" data-action="add-community-set" data-id="${esc(item.id || '')}">+ Workspace</button>
          </div>` : ''}
      </article>`;
  }

  function installFilters() {
    content.querySelectorAll('[data-search-filter]').forEach(button => {
      button.addEventListener('click', () => {
        content.querySelectorAll('[data-search-filter]').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        const filter = button.dataset.searchFilter;
        content.querySelectorAll('[data-search-section]').forEach(section => {
          const type = section.dataset.searchSection;
          const show = filter === 'all'
            || (filter === 'books' && type === 'books')
            || (filter === 'flashcards' && ['communityFlashcards', 'workspace', 'builtin'].includes(type))
            || (filter === 'users' && type === 'users')
            || (filter === 'notes' && type === 'notes')
            || (filter === 'quizzes' && type === 'quizzes');
          section.hidden = !show;
        });
      });
    });
  }

  async function fetchCommunity(query, requestId) {
    if (!query) return;

    if (state.controller) state.controller.abort();
    state.controller = new AbortController();

    try {
      const result = await communityFetch(`/api/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        signal: state.controller.signal
      });

      if (requestId !== state.requestId || state.query !== query) return;

      state.community = {
        users: Array.isArray(result?.users) ? result.users : [],
        flashcards: Array.isArray(result?.flashcards) ? result.flashcards : []
      };

      const results = allResults(query);
      renderDropdown(results, query);
      renderSearchHome(results, query);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (requestId !== state.requestId) return;

      console.error('Global community search failed:', error);
      state.community = { users: [], flashcards: [] };
      const results = allResults(query);
      renderDropdown(results, query);
      renderSearchHome(results, query);
    }
  }

  function runSearch(rawQuery) {
    const query = text(rawQuery);
    state.query = query;
    state.requestId += 1;
    const requestId = state.requestId;

    clearTimeout(state.timer);
    if (state.controller) state.controller.abort();

    const pageClearButton = document.querySelector('[data-search-clear-page]');
    if (pageClearButton) pageClearButton.hidden = !query;

    if (!query) {
      state.community = { users: [], flashcards: [] };
      panel.innerHTML = '';
      panel.hidden = true;
      if (route === 'home' && typeof render === 'function') render();
      return;
    }

    const local = localResults(query);
    renderDropdown(allResults(query), query, true);
    renderSearchHome(allResults(query), query, true);

    state.timer = setTimeout(() => {
      fetchCommunity(query, requestId);
    }, 250);
  }

  input.addEventListener('input', () => runSearch(input.value));

  input.addEventListener('focus', () => {
    if (state.query) {
      renderDropdown(allResults(state.query), state.query);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.target !== input) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      input.value = '';
      runSearch('');
      input.blur();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
  }, true);

  panel.addEventListener('click', event => {
    const book = event.target.closest('[data-search-open-book]');
    if (book) {
      event.preventDefault();
      window.open(book.dataset.searchOpenBook, '_blank', 'noopener,noreferrer');
      panel.hidden = true;
      return;
    }

    const row = event.target.closest('[data-route]');
    if (row && typeof window.go === 'function') {
      event.preventDefault();
      panel.hidden = true;
      window.go(row.dataset.route);
    }
  });

  content.addEventListener('click', event => {
    const clear = event.target.closest('[data-search-clear-page]');
    if (clear) {
      input.value = '';
      runSearch('');
      input.focus();
    }

    const book = event.target.closest('[data-search-open-book]');
    if (book) {
      event.preventDefault();
      window.open(book.dataset.searchOpenBook, '_blank', 'noopener,noreferrer');
    }

    const routeButton = event.target.closest('.global-search-card-hit[data-route]');
    if (routeButton && typeof window.go === 'function') {
      event.preventDefault();
      window.go(routeButton.dataset.route);
    }
  });

  document.addEventListener('click', event => {
    if (!document.getElementById('searchWrap')?.contains(event.target)) {
      panel.hidden = true;
    }
  });

  // Keep the search page synchronized with route changes without touching
  // the existing router implementation.
  const observer = new MutationObserver(() => {
    if (!state.query) return;
    if (route === 'home') {
      const current = document.querySelector('.global-search-page');
      if (!current) renderSearchHome(allResults(state.query), state.query);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
