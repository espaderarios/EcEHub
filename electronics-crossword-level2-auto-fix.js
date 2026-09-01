/* ============================================================
   EcE Hub — Electronics Crossword Level 2 completion fix

   Ensures a Level 2 entry is re-validated when it becomes complete
   because a crossing word supplied its final letter.

   The Level 2 runtime owns the real state/locking logic. This file
   only asks that runtime to run its normal full-entry validation.
   ============================================================ */
(function () {
  'use strict';

  const FLAG = '__eceCrosswordLevel2CompletionFixInstalled';
  if (window[FLAG]) return;
  window[FLAG] = true;

  let timer = 0;
  let lastSignature = '';
  let validating = false;

  function isLevel2Open() {
    return !!document.querySelector('.electronics-crossword-level2');
  }

  function boardSignature() {
    const board = document.querySelector('.electronics-crossword-level2 .cw2-board');
    if (!board) return '';

    return Array.from(board.querySelectorAll('.cw2-cell'))
      .map(cell => {
        const letter = cell.querySelector('.cw2-letter')?.textContent || '';
        return `${cell.dataset.row}:${cell.dataset.col}:${letter}:${cell.classList.contains('locked') ? 1 : 0}`;
      })
      .join('|');
  }

  function validateCompletedLevel2Words(force = false) {
    if (!isLevel2Open() || validating) return;

    const signature = boardSignature();
    if (!force && signature && signature === lastSignature) return;
    if (signature) lastSignature = signature;

    const fn = window.ExploreGames?.submitElectronicsCrosswordLevel2;
    if (typeof fn !== 'function') return;

    validating = true;
    try {
      fn.call(window.ExploreGames);
    } catch (error) {
      console.error('EcE Hub Level 2 completion validation failed:', error);
    } finally {
      validating = false;
    }
  }

  function scheduleValidation() {
    if (!isLevel2Open()) return;
    window.clearTimeout(timer);

    timer = window.setTimeout(() => {
      /* Run more than once because the crossword runtime renders the
         board asynchronously after accepting the final letter. */
      validateCompletedLevel2Words(true);
      window.setTimeout(() => validateCompletedLevel2Words(true), 60);
      window.setTimeout(() => validateCompletedLevel2Words(true), 180);
    }, 0);
  }

  document.addEventListener('keyup', event => {
    if (/^[a-zA-Z]$/.test(event.key)) scheduleValidation();
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest?.('.cw2-cell, [data-cw2-entry]')) {
      scheduleValidation();
    }
  }, true);

  const observer = new MutationObserver(() => {
    if (!isLevel2Open()) {
      lastSignature = '';
      return;
    }

    const signature = boardSignature();
    if (signature && signature !== lastSignature) {
      lastSignature = signature;
      scheduleValidation();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  console.info('EcE Hub Level 2 completion/crossing validation fix installed.');
})();
