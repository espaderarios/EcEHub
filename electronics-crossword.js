/* EcE Hub — Electronics Crossword runtime lock/navigation patch
 *
 * The full crossword implementation is loaded from the last stable UI commit,
 * then this small compatibility layer makes locked cells truly immutable even
 * when they are shared by Across/Down entries.
 */
(function () {
  'use strict';

  const ORIGINAL = 'https://raw.githubusercontent.com/espaderarios/EcEHub/7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';
  const FLAG = '__eceCrosswordLockedCellPatchLoaded';

  if (window[FLAG]) return;
  window[FLAG] = true;

  const loadOriginal = () => {
    if (document.querySelector('script[data-ece-crossword-original]')) {
      installPatch();
      return;
    }

    const script = document.createElement('script');
    script.src = `${ORIGINAL}?v=locked-cell-fix-1`;
    script.async = false;
    script.dataset.eceCrosswordOriginal = 'true';
    script.addEventListener('load', installPatch, { once: true });
    document.head.appendChild(script);
  };

  function board() {
    return document.getElementById('electronicsCrosswordBoard');
  }

  function cells() {
    return Array.from(document.querySelectorAll('#electronicsCrosswordBoard .electronics-crossword-cell'));
  }

  function cellAt(row, col) {
    return document.querySelector(
      `#electronicsCrosswordBoard .electronics-crossword-cell[data-row="${row}"][data-col="${col}"]`
    );
  }

  function selectedCell() {
    return document.querySelector('#electronicsCrosswordBoard .electronics-crossword-cell.selected');
  }

  function activeClue() {
    return document.querySelector('.electronics-crossword-clue.active[data-direction]');
  }

  function wordCells(clue) {
    if (!clue) return [];

    const number = clue.dataset.number;
    const direction = clue.dataset.direction;
    const start = cells().find(cell => {
      const numberEl = cell.querySelector('.electronics-crossword-number');
      return numberEl && numberEl.textContent.trim() === String(number);
    });

    if (!start) return [];

    const row = Number(start.dataset.row);
    const col = Number(start.dataset.col);
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    const result = [];

    for (let i = 0; i < 50; i++) {
      const cell = cellAt(row + dr * i, col + dc * i);
      if (!cell) break;
      result.push(cell);
    }

    return result;
  }

  function nextUnlockedInWord(fromCell, clue, backwards) {
    const word = wordCells(clue);
    if (!word.length) return null;

    let index = word.indexOf(fromCell);
    if (index < 0) index = backwards ? word.length : -1;

    const step = backwards ? -1 : 1;
    for (let i = index + step; i >= 0 && i < word.length; i += step) {
      if (!word[i].classList.contains('locked')) return word[i];
    }

    return null;
  }

  function nextUnlockedClueCell(currentClue) {
    const clues = Array.from(document.querySelectorAll('.electronics-crossword-clue[data-direction]'));
    const start = currentClue ? clues.indexOf(currentClue) : -1;

    for (let offset = 1; offset <= clues.length; offset++) {
      const clue = clues[(start + offset + clues.length) % clues.length];
      const word = wordCells(clue);
      const editable = word.find(cell => !cell.classList.contains('locked'));
      if (editable) return editable;
    }

    return null;
  }

  function selectCell(cell) {
    if (!cell || cell.classList.contains('locked')) return false;
    cell.click();
    return true;
  }

  function redirectLockedSelection() {
    const selected = selectedCell();
    if (!selected || !selected.classList.contains('locked')) return false;

    const clue = activeClue();
    const next = nextUnlockedInWord(selected, clue, false) || nextUnlockedClueCell(clue);
    if (next) {
      selectCell(next);
      return true;
    }

    return false;
  }

  function installPatch() {
    if (window.__eceCrosswordLockedCellPatchInstalled) return;
    window.__eceCrosswordLockedCellPatchInstalled = true;

    const root = document.documentElement;

    // Locked cells are presentation-only. Mouse/touch selection is redirected
    // to the next editable square instead of allowing an Across/Down crossing
    // to overwrite a word that has already been validated.
    document.addEventListener('click', event => {
      const cell = event.target.closest?.('#electronicsCrosswordBoard .electronics-crossword-cell');
      if (!cell || !cell.classList.contains('locked')) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const clue = activeClue();
      const next = nextUnlockedInWord(cell, clue, false) || nextUnlockedClueCell(clue);
      if (next) next.click();
    }, true);

    document.addEventListener('keydown', event => {
      const boardEl = board();
      if (!boardEl) return;
      if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;

      const selected = selectedCell();
      if (!selected) return;

      const clue = activeClue();
      const isLetter = /^[a-zA-Z]$/.test(event.key);
      const isBackspace = event.key === 'Backspace';

      // If the current square is locked, never let the original crossword
      // handler write into it. Move to the nearest editable square first.
      if (selected.classList.contains('locked') && (isLetter || isBackspace)) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const next = isBackspace
          ? nextUnlockedInWord(selected, clue, true) || nextUnlockedClueCell(clue)
          : nextUnlockedInWord(selected, clue, false) || nextUnlockedClueCell(clue);

        if (next) next.click();
        return;
      }

      // Let the original handler process the character, then inspect the
      // rendered state. If that character completed a word and the original
      // code locked it, immediately advance off the newly locked cells.
      if (isLetter || isBackspace) {
        setTimeout(() => {
          redirectLockedSelection();
        }, 0);
      }
    }, true);

    // Rerenders replace the selected cell. Keep the cursor out of locked
    // squares after automatic validation as well as after clue switching.
    const observer = new MutationObserver(() => {
      if (!board()) return;
      requestAnimationFrame(() => redirectLockedSelection());
    });

    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

    // If the crossword is mounted after this script runs, install the same
    // guard once its board exists. The event delegation above is global, so
    // this only needs to nudge the cursor after the first render.
    const wait = setInterval(() => {
      if (board()) {
        clearInterval(wait);
        redirectLockedSelection();
      }
    }, 100);
    setTimeout(() => clearInterval(wait), 15000);
  }

  loadOriginal();
})();