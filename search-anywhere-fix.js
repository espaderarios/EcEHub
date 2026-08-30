/* EcE Hub — global search dropdown on every route
 *
 * The legacy live-search fix only runs while Home is active. That means
 * opening Library/Classes/etc. leaves the top search field to the older
 * People-only search shim. This file owns the dropdown everywhere.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const LIBRARY_URL = new URL('library.json', document.baseURI).href;
  const state = { books: null, timer: 0, request: 0 };

  const text = value => String(value ?? '').trim();
  const lower = value => text(value).toLocaleLowerCase();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function token() {
    try {
      return localStorage.getItem('ecehub_session_token')
        || localStorage.getItem('ecehub_community_session')
        || '';
    } catch {
      return '';
    }
  }

  async function loadBooks() {
    if (Array.isArray(state.books)) return state.books;
    try {
      const response = await fetch(LIBRARY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`library.json returned ${response.status}`);
      const payload = await response.json();
      state.books = Array.isArray(payload) ? payload : [];
    } catch (error) {
      console.warn('Global search could not load library.json:', error);
      state.books = [];
    }
    return state.books;
  }

  async function communitySearch(q) {
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const response = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, {
        credentials: 'include',
        headers
      });
      if (!response.ok) return { users: [], flashcards: [] };
      const payload = await response.json();
      return {
        users: Array.isArray(payload?.users) ? payload.users : [],
        flashcards: Array.isArray(payload?.flashcards)
          ? payload.flashcards
          : (Array.isArray(payload?.communityFlashcards) ? payload.communityFlashcards : [])
      };
    } catch (error) {
      console.warn('Global community search unavailable:', error);
      return { users: [], flashcards: [] };
    }
  }

  function matchBook(book, q) {
    return [
      book?.title,
      book?.author,
      book?.course,
      book?.subject,
      book?.folder,
      book?.description,
      Array.isArray(book?.yearLevel) ? book.yearLevel.join(' ') : book?.yearLevel
    ].some(value => lower(value).includes(q));
  }

  function scoreBook(book, q) {
    const title = lower(book?.title);
    const author = lower(book?.author);
    const course = lower(book?.course || book?.subject);
    let score = 0;
    if (title === q) score += 1000;
    else if (title.startsWith(q)) score += 700;
    else if (title.includes(q)) score += 450;
    if (author.includes(q)) score += 180;
    if (course.includes(q)) score += 160;
    return score;
  }

  function row(type, item) {
    if (type === 'books') {
      const url = item.driveUrl || item.url || '';
      return `
        <button type="button" class="global-search-row" data-search-open-book="${esc(url)}">
          <span class="global-search-row-icon books">▤</span>
          <span class="global-search-row-copy">
            <strong>${esc(item.title || 'Untitled PDF')}</strong>
            <small>${esc(item.author || item.course || item.subject || 'PDF')}</small>
          </span>
          <span class="global-search-row-type">Books / PDFs</span>
        </button>`;
    }

    if (type === 'flashcards') {
      return `
        <button type="button" class="global-search-row" data-action="view-community-set" data-id="${esc(item.id || '')}">
          <span class="global-search-row-icon communityFlashcards">▧</span>
          <span class="global-search-row-copy">
            <strong>${esc(item.title || 'Untitled set')}</strong>
            <small>${esc(item.subject || 'General')} · ${Number(item.cardCount || 0)} cards</small>
          </span>
          <span class="global-search-row-type">Community Flashcards</span>
        </button>`;
    }

    return `
      <button type="button" class="global-search-row" data-action="view-community-user" data-id="${esc(item.id || '')}" data-username="${esc(item.username || '')}">
        <span class="global-search-row-icon users">${item.avatarUrl ? `<img src="${esc(item.avatarUrl)}" alt="">` : '◉'}</span>
        <span class="global-search-row-copy">
          <strong>${esc(item.displayName || item.username || 'Community member')}</strong>
          <small>@${esc(item.username || '')}</small>
        </span>
        <span class="global-search-row-type">People</span>
      </button>`;
  }

  function group(title, type, items) {
    if (!items.length) return '';
    return `
      <div class="global-search-group search-anywhere-group">
        <div class="global-search-group-title">${esc(title)}</div>
        ${items.slice(0, 5).map(item => row(type, item)).join('')}
      </div>`;
  }

  async function search(input, panel, value) {
    const q = lower(value);
    const requestId = ++state.request;
    if (!q) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }

    panel.hidden = false;
    panel.innerHTML = '<div class="global-search-status">Searching EcE Hub…</div>';

    const [books, community] = await Promise.all([
      loadBooks(),
      communitySearch(q)
    ]);

    if (requestId !== state.request || input.value.trim().toLocaleLowerCase() !== q) return;

    const matchedBooks = books
      .filter(book => matchBook(book, q))
      .sort((a, b) => scoreBook(b, q) - scoreBook(a, q));

    const matchedFlashcards = community.flashcards.filter(set => [
      set?.title, set?.subject, set?.description,
      set?.authorUsername, set?.author_username,
      set?.authorName, set?.author?.username
    ].some(value => lower(value).includes(q)));

    const matchedUsers = community.users.filter(user => [
      user?.username, user?.displayName, user?.bio
    ].some(value => lower(value).includes(q)));

    const html = [
      group('Books / PDFs', 'books', matchedBooks),
      group('Community Flashcards', 'flashcards', matchedFlashcards),
      group('People', 'users', matchedUsers)
    ].filter(Boolean).join('');

    panel.innerHTML = html || `<div class="global-search-status">No results for <strong>${esc(value)}</strong></div>`;
    panel.hidden = false;
  }

  function install() {
    const input = document.getElementById('globalSearch');
    const panel = document.getElementById('searchResults');
    if (!input || !panel || input.dataset.searchAnywhereInstalled === '1') return;

    input.dataset.searchAnywhereInstalled = '1';

    input.addEventListener('input', event => {
      event.stopImmediatePropagation();
      clearTimeout(state.timer);
      state.timer = setTimeout(() => search(input, panel, input.value), 30);
    }, true);

    input.addEventListener('focus', () => {
      if (input.value.trim()) search(input, panel, input.value);
    });

    console.log('EcE Hub global search dropdown enabled on all routes.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
