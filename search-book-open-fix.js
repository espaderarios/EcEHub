/* EcE Hub — make Library books in global search actually open */
(() => {
  'use strict';

  function openSearchedBook(event) {
    const target = event.target?.closest?.('[data-search-open-book]');
    if (!target) return;

    const rawUrl = target.getAttribute('data-search-open-book');
    if (!rawUrl) return;

    let url;
    try {
      url = new URL(rawUrl, document.baseURI);
    } catch (error) {
      console.error('EcE Hub search: invalid book URL:', rawUrl, error);
      return;
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      console.error('EcE Hub search: blocked non-web book URL:', url.href);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    // Library entries intentionally keep their original Google Drive URL,
    // so Google Drive's normal PDF viewer handles the document.
    window.open(url.href, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('click', openSearchedBook, true);
  console.log('EcE Hub searched-book opener installed.');
})();
