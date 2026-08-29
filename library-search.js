/* EcE Hub — load the public Library catalog into the global Home search */
(() => {
  'use strict';

  const LIBRARY_URL = new URL('library.json', document.baseURI).href;
  const state = { loaded: false, loading: false };
  const text = value => String(value ?? '').trim();

  function normalizeBook(book) {
    const title = text(book?.title);
    const folder = text(book?.folder);
    const driveUrl = text(book?.driveUrl);
    const yearLevel = Array.isArray(book?.yearLevel)
      ? book.yearLevel.filter(Boolean).map(text)
      : [];

    return {
      ...book,
      title,
      folder,
      subject: folder,
      course: folder,
      description: folder,
      yearLevel,
      driveUrl,
      _librarySource: true
    };
  }

  function mergeBooks(existing, libraryBooks) {
    const merged = [];
    const seen = new Set();

    for (const raw of [...existing, ...libraryBooks]) {
      const book = normalizeBook(raw);
      if (!book.title && !book.driveUrl) continue;

      const key = book.driveUrl
        || `${book.title.toLocaleLowerCase()}::${book.folder.toLocaleLowerCase()}`;

      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(book);
    }

    return merged;
  }

  function rerunActiveSearch() {
    const input = document.getElementById('globalSearch');
    if (!input || !text(input.value)) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyLibrary(libraryBooks) {
    globalThis.ECEHUB_LIBRARY_BOOKS = libraryBooks;

    if (globalThis.data && Array.isArray(globalThis.data.books)) {
      globalThis.data.books = mergeBooks(globalThis.data.books, libraryBooks);
      console.log(
        'EcE Hub Library search index applied:',
        libraryBooks.length,
        'library books;',
        globalThis.data.books.length,
        'total searchable books.'
      );
    } else {
      console.log(
        'EcE Hub Library catalog loaded before workspace data; retaining library index.'
      );
    }

    rerunActiveSearch();
  }

  async function loadLibraryIntoSearch() {
    if (state.loaded || state.loading) return;
    state.loading = true;

    try {
      const response = await fetch(LIBRARY_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`library.json returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const libraryBooks = Array.isArray(payload)
        ? payload.map(normalizeBook)
        : [];

      applyLibrary(libraryBooks);
      state.loaded = true;

      /*
       * app.js loads its own library data asynchronously and may replace
       * data.books after this file runs. Re-apply the public catalog for a
       * short window so that the Home search cannot lose these books.
       */
      let attempts = 0;
      const repairTimer = setInterval(() => {
        attempts += 1;
        if (globalThis.data && Array.isArray(globalThis.data.books)) {
          const before = globalThis.data.books.length;
          globalThis.data.books = mergeBooks(
            globalThis.data.books,
            libraryBooks
          );

          if (globalThis.data.books.length !== before) {
            console.log(
              'EcE Hub Library search index repaired:',
              globalThis.data.books.length,
              'searchable books.'
            );
            rerunActiveSearch();
          }
        }

        if (attempts >= 40) clearInterval(repairTimer);
      }, 250);

    } catch (error) {
      console.error('Failed to load library catalog into Home search:', error);
    } finally {
      state.loading = false;
    }
  }

  function install() {
    loadLibraryIntoSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
