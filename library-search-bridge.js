/* EcE Hub — authoritative Library catalog bridge for Home live search */
(() => {
  'use strict';

  const LIBRARY_URL = new URL('library.json', document.baseURI).href;
  let libraryBooks = [];
  let loaded = false;
  let loading = false;
  let activeQuery = '';
  let request = 0;

  const text = value => String(value ?? '').trim();
  const lower = value => text(value).toLocaleLowerCase();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function normalize(book) {
    return {
      ...book,
      title: text(book?.title),
      author: text(book?.author),
      folder: text(book?.folder),
      course: text(book?.course || book?.folder),
      driveUrl: text(book?.driveUrl),
      yearLevel: Array.isArray(book?.yearLevel) ? book.yearLevel : []
    };
  }

  function matches(book, query) {
    const q = lower(query);
    if (!q) return false;
    return [
      book.title,
      book.author,
      book.folder,
      book.course,
      ...(book.yearLevel || [])
    ].some(value => lower(value).includes(q));
  }

  function score(book, query) {
    const q = lower(query);
    const title = lower(book.title);
    const author = lower(book.author);
    const folder = lower(book.folder);
    let value = 0;
    if (title === q) value += 1000;
    else if (title.startsWith(q)) value += 700;
    else if (title.includes(q)) value += 500;
    if (author.includes(q)) value += 250;
    if (folder.includes(q)) value += 150;
    return value;
  }

  function results(query) {
    return libraryBooks
      .filter(book => matches(book, query))
      .sort((a, b) => score(b, query) - score(a, query))
      .slice(0, 50);
  }

  function bookRow(book) {
    return `
      <button type="button" class="global-search-row" data-search-open-book="${esc(book.driveUrl)}">
        <span class="global-search-row-icon books">▤</span>
        <span class="global-search-row-copy">
          <strong>${esc(book.title || 'Untitled')}</strong>
          <small>${esc(book.course || book.folder || 'PDF')}</small>
        </span>
        <span class="global-search-row-type">Book / PDF</span>
      </button>`;
  }

  function bookCard(book) {
    const description = book.author || book.folder || 'PDF resource';
    return `
      <article class="global-search-card card">
        <button type="button" class="global-search-card-hit" data-search-open-book="${esc(book.driveUrl)}">
          <div class="global-search-card-top">
            <span class="global-search-card-icon books">▤</span>
            <span class="global-search-card-kind">Book / PDF</span>
          </div>
          <h3>${esc(book.title || 'Untitled')}</h3>
          <div class="global-search-card-meta">${esc(book.course || book.folder || 'PDF')}</div>
          <p>${esc(description)}</p>
        </button>
      </article>`;
  }

  function patchDropdown(query, found) {
    const panel = document.getElementById('searchResults');
    if (!panel || !query || !found.length) return;

    const existing = panel.querySelector('.library-search-bridge-group');
    if (existing) existing.remove();

    const group = document.createElement('div');
    group.className = 'global-search-group library-search-bridge-group';
    group.innerHTML = `
      <div class="global-search-group-title">Book / PDF</div>
      ${found.slice(0, 3).map(bookRow).join('')}`;

    const head = panel.querySelector('.global-search-dropdown-head');
    if (head) {
      const count = Number((head.lastElementChild?.textContent || '0').replace(/\D/g, '')) || 0;
      if (head.lastElementChild) head.lastElementChild.textContent = `${count + found.length} found`;
    }

    panel.appendChild(group);
    panel.hidden = false;
  }

  function patchHome(query, found) {
    if (!found.length) return;
    const page = document.querySelector('.global-search-page');
    if (!page) return;

    let section = page.querySelector('[data-search-section="books"]');
    if (!section) {
      section = document.createElement('section');
      section.className = 'global-search-section';
      section.dataset.searchSection = 'books';
      const filters = page.querySelector('.global-search-filters');
      const firstSection = page.querySelector('.global-search-section');
      if (firstSection) page.insertBefore(section, firstSection);
      else if (filters) filters.insertAdjacentElement('afterend', section);
      else page.appendChild(section);
    }

    section.innerHTML = `
      <div class="global-search-section-head">
        <div>
          <span class="global-search-section-icon">▤</span>
          <h2>Book / PDF</h2>
        </div>
        <span>${found.length}</span>
      </div>
      <div class="global-search-results-grid">
        ${found.slice(0, 12).map(bookCard).join('')}
      </div>`;

    const header = page.querySelector('.global-search-page-header p');
    if (header) {
      const allCount = page.querySelectorAll('.global-search-section').length;
      const textValue = header.textContent || '';
      const match = textValue.match(/(\d+) result/);
      const oldCount = match ? Number(match[1]) : 0;
      const existingBooks = page.dataset.librarySearchCount
        ? Number(page.dataset.librarySearchCount)
        : 0;
      const total = Math.max(0, oldCount - existingBooks) + found.length;
      page.dataset.librarySearchCount = String(found.length);
      header.innerHTML = `${total} result${total === 1 ? '' : 's'} for <strong>“${esc(query)}”</strong>`;
    }

    const empty = page.querySelector('.global-search-empty');
    if (empty) empty.remove();
  }

  async function load() {
    if (loaded || loading) return;
    loading = true;
    try {
      const response = await fetch(`${LIBRARY_URL}?search_bridge=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`library.json returned HTTP ${response.status}`);
      const payload = await response.json();
      libraryBooks = Array.isArray(payload) ? payload.map(normalize) : [];
      loaded = true;
      console.log('Library search bridge loaded:', libraryBooks.length, 'books');
    } catch (error) {
      console.error('Library search bridge failed:', error);
    } finally {
      loading = false;
    }
  }

  async function run(query) {
    activeQuery = text(query);
    const id = ++request;
    if (!activeQuery) return;
    await load();
    if (id !== request || activeQuery !== text(query)) return;
    const found = results(activeQuery);
    patchDropdown(activeQuery, found);
    patchHome(activeQuery, found);
  }

  document.addEventListener('input', event => {
    if (event.target?.id !== 'globalSearch') return;
    run(event.target.value);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('#searchResults')) return;
    const book = event.target.closest('[data-search-open-book]');
    if (book) return;
  });

  load();
})();
