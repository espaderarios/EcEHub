/* EcE Hub — canonical global search controller
 * One owner for Home live-search, Library/book search, People search,
 * community flashcards, local workspace search, and route visibility.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const LIBRARY_URL = new URL('library.json', document.baseURI).href;
  const HIDDEN_ROUTES = new Set(['classes', 'flashcards', 'notes', 'tools']);
  const state = {
    query: '',
    timer: 0,
    request: 0,
    books: null,
    community: { users: [], flashcards: [] }
  };

  const text = v => String(v ?? '').trim();
  const lower = v => text(v).toLocaleLowerCase();
  const esc = v => text(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function elements() {
    return {
      input: document.getElementById('globalSearch'),
      panel: document.getElementById('searchResults'),
      clear: document.getElementById('searchClear'),
      content: document.getElementById('content'),
      wrap: document.getElementById('searchWrap')
    };
  }

  function route() {
    return document.querySelector('.nav-item.active')?.dataset?.route || '';
  }

  function isHome() { return route() === 'home'; }
  function searchVisible() { return !HIDDEN_ROUTES.has(route()); }

  function token() {
    try {
      return localStorage.getItem('ecehub_session_token')
        || localStorage.getItem('ecehub_community_session') || '';
    } catch { return ''; }
  }

  function syncVisibility() {
    const e = elements();
    if (!e.wrap) return;
    const hidden = !searchVisible();
    e.wrap.hidden = hidden;
    e.wrap.classList.toggle('global-search-route-hidden', hidden);
    e.wrap.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    if (hidden) {
      state.query = '';
      state.request += 1;
      if (e.input) e.input.value = '';
      if (e.clear) e.clear.hidden = true;
      if (e.panel) { e.panel.hidden = true; e.panel.innerHTML = ''; }
    }
  }

  async function loadBooks() {
    if (Array.isArray(state.books)) return state.books;
    try {
      const response = await fetch(LIBRARY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`library.json returned HTTP ${response.status}`);
      const payload = await response.json();
      state.books = Array.isArray(payload) ? payload : [];
    } catch (error) {
      console.warn('EcE Hub search: library index unavailable:', error);
      state.books = [];
    }
    return state.books;
  }

  async function loadCommunity(q) {
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const response = typeof globalThis.communityFetch === 'function'
        ? await globalThis.communityFetch(`/api/search?q=${encodeURIComponent(q)}`)
        : await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include', headers });
      if (!response || !response.ok) return { users: [], flashcards: [] };
      const payload = await response.json();
      return {
        users: Array.isArray(payload?.users) ? payload.users : [],
        flashcards: Array.isArray(payload?.flashcards)
          ? payload.flashcards
          : (Array.isArray(payload?.communityFlashcards) ? payload.communityFlashcards : [])
      };
    } catch (error) {
      console.warn('EcE Hub search: community search unavailable:', error);
      return { users: [], flashcards: [] };
    }
  }

  function dataSources() {
    const d = globalThis.data || {};
    return {
      sets: Array.isArray(d.sets) ? d.sets : [],
      notes: Array.isArray(d.notes) ? d.notes : [],
      quizzes: Array.isArray(d.quizzes) ? d.quizzes : [],
      builtin: Array.isArray(globalThis.BUILTIN_FLASHCARDS) ? globalThis.BUILTIN_FLASHCARDS : []
    };
  }

  function matches(item, fields, q) {
    return fields.some(v => lower(v).includes(q));
  }

  function score(item, q) {
    const title = lower(item.title);
    const subject = lower(item.subject || item.course);
    const author = lower(item.author);
    const username = lower(item.username || item.authorUsername || item.author_username);
    const name = lower(item.displayName || item.authorName);
    const description = lower(item.description || item.content || item.text || item.body);
    let value = 0;
    if (title === q) value += 1000; else if (title.startsWith(q)) value += 700; else if (title.includes(q)) value += 450;
    if (subject === q) value += 350; else if (subject.startsWith(q)) value += 220; else if (subject.includes(q)) value += 150;
    if (author === q) value += 500; else if (author.includes(q)) value += 180;
    if (username === q) value += 900; else if (username.startsWith(q)) value += 600; else if (username.includes(q)) value += 300;
    if (name === q) value += 850; else if (name.startsWith(q)) value += 550; else if (name.includes(q)) value += 300;
    if (description.includes(q)) value += 80;
    return value;
  }

  function localResults(q, books) {
    const d = dataSources();
    const sort = list => list.map(x => ({ ...x, _score: score(x, q) }))
      .sort((a, b) => b._score - a._score).slice(0, 24);
    return {
      books: sort(books.filter(x => matches(x, [x.title, x.folder, x.course, x.subject, x.author, x.description, Array.isArray(x.yearLevel) ? x.yearLevel.join(' ') : x.yearLevel], q))),
      workspace: sort(d.sets.filter(x => matches(x, [x.title, x.subject, x.description], q))),
      builtin: sort(d.builtin.filter(x => matches(x, [x.title, x.subject, x.description], q))),
      notes: sort(d.notes.filter(x => matches(x, [x.title, x.subject, x.content, x.text, x.body], q))),
      quizzes: sort(d.quizzes.filter(x => matches(x, [x.title, x.subject, x.description], q)))
    };
  }

  function communityResults(payload, q) {
    const flashcards = (payload.flashcards || [])
      .filter(x => matches(x, [x.title, x.subject, x.description, x.authorUsername, x.author_username, x.username, x.authorName], q))
      .map(x => ({ ...x, _score: score(x, q) }))
      .sort((a, b) => b._score - a._score).slice(0, 24);

    const users = [];
    const seen = new Set();
    for (const user of payload.users || []) {
      const username = text(user?.username);
      const displayName = text(user?.displayName || user?.name || username);
      const key = lower(user?.id || username || displayName);
      if (!key || seen.has(key) || !lower(`${username} ${displayName} ${user?.bio || ''}`).includes(q)) continue;
      seen.add(key);
      users.push({ ...user, username, displayName, _score: score({ username, displayName, description: user?.bio }, q) });
    }
    return { communityFlashcards: flashcards, users: users.sort((a, b) => b._score - a._score).slice(0, 24) };
  }

  const ORDER = [
    ['communityFlashcards', 'Community Flashcards', '▧'],
    ['books', 'Books / PDFs', '▤'],
    ['workspace', 'My Flashcards', '▧'],
    ['builtin', 'Built-in Flashcards', '▤⃞'],
    ['users', 'People', '◉'],
    ['notes', 'Notes', '☑'],
    ['quizzes', 'Quizzes', '◈']
  ];

  function title(type, item) { return type === 'users' ? (item.displayName || item.username || 'Community member') : (item.title || 'Untitled'); }
  function meta(type, item) {
    if (type === 'users') return item.username ? `@${item.username}` : 'Community member';
    if (type === 'books') return item.author ? `${item.course || item.subject || 'PDF'} · ${item.author}` : (item.course || item.subject || 'PDF');
    if (['communityFlashcards', 'workspace', 'builtin'].includes(type)) {
      const count = Number(item.cardCount || (Array.isArray(item.cards) ? item.cards.length : 0));
      return `${item.subject || 'General'} · ${count} card${count === 1 ? '' : 's'}`;
    }
    return item.subject || (type === 'notes' ? 'Note' : 'Quiz');
  }
  function action(type, item) {
    const id = esc(item.id || '');
    if (type === 'books' && (item.driveUrl || item.url)) return `data-search-open-book="${esc(item.driveUrl || item.url)}"`;
    if (type === 'communityFlashcards') return `data-action="view-community-set" data-id="${id}"`;
    if (type === 'users') return `data-action="view-community-user" data-id="${id}" data-username="${esc(item.username || '')}"`;
    if (type === 'workspace') return `data-route="flashcards" data-search-id="${id}"`;
    if (type === 'builtin') return `data-route="builtin-flashcards" data-search-id="${id}"`;
    if (type === 'notes') return `data-route="notes" data-search-id="${id}"`;
    if (type === 'quizzes') return `data-route="quizzes" data-search-id="${id}"`;
    return '';
  }

  function row(type, item) {
    const icon = type === 'users' && item.avatarUrl ? `<img src="${esc(item.avatarUrl)}" alt="" loading="lazy">` : ORDER.find(x => x[0] === type)?.[2] || '•';
    return `<button type="button" class="global-search-row" ${action(type, item)}><span class="global-search-row-icon ${type}">${icon}</span><span class="global-search-row-copy"><strong>${esc(title(type, item))}</strong><small>${esc(meta(type, item))}</small></span><span class="global-search-row-type">${esc(ORDER.find(x => x[0] === type)?.[1] || 'Result')}</span></button>`;
  }

  function card(type, item) {
    const desc = text(type === 'books' ? (item.author || item.folder || item.description) : (item.description || item.bio || item.content || item.text || item.body));
    const icon = type === 'users' && item.avatarUrl ? `<img src="${esc(item.avatarUrl)}" alt="" loading="lazy">` : ORDER.find(x => x[0] === type)?.[2] || '•';
    return `<article class="global-search-card card"><button type="button" class="global-search-card-hit" ${action(type, item)}><div class="global-search-card-top"><span class="global-search-card-icon ${type}">${icon}</span><span class="global-search-card-kind">${esc(ORDER.find(x => x[0] === type)?.[1] || 'Result')}</span></div><h3>${esc(title(type, item))}</h3><div class="global-search-card-meta">${esc(meta(type, item))}</div>${desc ? `<p>${esc(desc.slice(0, 180))}${desc.length > 180 ? '…' : ''}</p>` : ''}</button>${type === 'communityFlashcards' ? `<div class="global-search-card-actions"><button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(item.id || '')}">Study</button><button type="button" class="btn" data-action="add-community-set" data-id="${esc(item.id || '')}">+ Workspace</button></div>` : ''}</article>`;
  }

  function groups(results) { return ORDER.map(([type]) => [type, results[type] || []]).filter(([, items]) => items.length); }

  function renderDropdown(e, q, results, loading) {
    if (!q || !searchVisible()) { e.panel.hidden = true; return; }
    const gs = groups(results);
    e.panel.innerHTML = gs.length
      ? `<div class="global-search-dropdown-head"><span>Results for “${esc(q)}”</span><span>Live</span></div>${gs.slice(0, 6).map(([t, items]) => `<div class="global-search-group"><div class="global-search-group-title">${esc(ORDER.find(x => x[0] === t)[1])}</div>${items.slice(0, 4).map(x => row(t, x)).join('')}</div>`).join('')}`
      : `<div class="global-search-status">${loading ? 'Searching EcE Hub…' : `No results for <strong>${esc(q)}</strong>`}</div>`;
    e.panel.hidden = false;
  }

  function renderHome(e, q, results, loading) {
    if (!isHome() || !q) return;
    const gs = groups(results);
    const count = gs.reduce((sum, [, items]) => sum + items.length, 0);
    e.content.innerHTML = `<div class="global-search-page"><div class="global-search-page-header"><div><div class="global-search-eyebrow">EcE HUB SEARCH</div><h1>Search results</h1><p>${loading ? 'Searching…' : `${count} result${count === 1 ? '' : 's'} for`} <strong>“${esc(q)}”</strong></p></div><button type="button" class="btn" data-search-clear-page>Clear search</button></div><div class="global-search-filters" role="tablist"><button type="button" class="active" data-search-filter="all">All</button><button type="button" data-search-filter="books">Books</button><button type="button" data-search-filter="flashcards">Flashcards</button><button type="button" data-search-filter="users">People</button><button type="button" data-search-filter="notes">Notes</button><button type="button" data-search-filter="quizzes">Quizzes</button></div>${gs.length ? gs.map(([t, items]) => `<section class="global-search-section" data-search-section="${t}"><div class="global-search-section-head"><div><span class="global-search-section-icon">${ORDER.find(x => x[0] === t)[2]}</span><h2>${esc(ORDER.find(x => x[0] === t)[1])}</h2></div><span>${items.length}</span></div><div class="global-search-results-grid">${items.slice(0, 12).map(x => card(t, x)).join('')}</div></section>`).join('') : (!loading ? '<div class="global-search-empty card"><div class="global-search-empty-icon">⌕</div><h2>No results found</h2><p>Try another title, subject, username, or keyword.</p></div>' : '')}</div>`;
    installFilters(e.content);
  }

  function installFilters(content) {
    content.querySelectorAll('[data-search-filter]').forEach(button => {
      button.addEventListener('click', () => {
        content.querySelectorAll('[data-search-filter]').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        const wanted = button.dataset.searchFilter;
        content.querySelectorAll('[data-search-section]').forEach(section => {
          const type = section.dataset.searchSection;
          section.hidden = !(wanted === 'all' || (wanted === 'books' && type === 'books') || (wanted === 'flashcards' && ['communityFlashcards', 'workspace', 'builtin'].includes(type)) || (wanted === 'users' && type === 'users') || (wanted === 'notes' && type === 'notes') || (wanted === 'quizzes' && type === 'quizzes'));
        });
      });
    });
  }

  function clear(e) {
    state.query = '';
    state.request += 1;
    clearTimeout(state.timer);
    e.input.value = '';
    e.clear.hidden = true;
    e.panel.hidden = true;
    e.panel.innerHTML = '';
    if (isHome() && typeof globalThis.render === 'function') globalThis.render();
  }

  async function search(e, value) {
    const q = lower(value);
    const requestId = ++state.request;
    state.query = q;
    if (!q || !searchVisible()) { if (!q) clear(e); return; }
    e.clear.hidden = false;
    e.panel.hidden = false;
    e.panel.innerHTML = '<div class="global-search-status">Searching EcE Hub…</div>';

    const books = await loadBooks();
    if (requestId !== state.request || state.query !== q) return;
    const local = localResults(q, books);
    renderDropdown(e, q, local, true);
    renderHome(e, q, local, true);

    const community = await loadCommunity(q);
    if (requestId !== state.request || state.query !== q) return;
    const results = { ...local, ...communityResults(community, q) };
    renderDropdown(e, q, results, false);
    renderHome(e, q, results, false);
  }

  function install() {
    const e = elements();
    if (!e.input || !e.panel || !e.content || !e.wrap) { setTimeout(install, 100); return; }
    if (e.input.dataset.canonicalSearchInstalled === '1') return;
    e.input.dataset.canonicalSearchInstalled = '1';

    e.input.addEventListener('input', () => {
      clearTimeout(state.timer);
      state.timer = setTimeout(() => search(e, e.input.value), 40);
    });
    e.input.addEventListener('focus', () => {
      if (e.input.value.trim() && searchVisible()) search(e, e.input.value);
    });
    e.clear.addEventListener('click', () => clear(e));
    document.addEventListener('click', event => {
      if (event.target.closest('[data-search-clear-page]')) { event.preventDefault(); clear(e); }
    });

    const nav = document.getElementById('sidebarScroll');
    if (nav) new MutationObserver(syncVisibility).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    syncVisibility();
    console.log('EcE Hub canonical global search installed.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  setTimeout(install, 250);
})();
