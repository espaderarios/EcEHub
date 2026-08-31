/* EcE Hub — Electronics Crossword runtime lock/navigation patch
 *
 * Loads the stable crossword implementation and keeps its API intact when
 * explore-games.js initializes window.ExploreGames later in the page lifecycle.
 * Also prevents validated cells from being edited through Across/Down.
 */
(function () {
  'use strict';

  const ORIGINAL = 'https://raw.githubusercontent.com/espaderarios/EcEHub/7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';
  const FLAG = '__eceCrosswordLockedCellPatchLoaded';
  const API_FLAG = '__eceCrosswordApiBridgeInstalled';
  const API_METHODS = [
    'startElectronicsCrossword',
    'submitElectronicsCrossword',
    'revealElectronicsCrossword',
    'nextElectronicsCrossword',
    'restartElectronicsCrossword',
    'exitElectronicsCrossword'
  ];

  if (window[FLAG]) return;
  window[FLAG] = true;

  let crosswordApi = {};
  let exploreGamesBacking = null;

  function captureCrosswordApi() {
    const current = window.ExploreGames;
    if (!current || typeof current !== 'object') return;

    API_METHODS.forEach(name => {
      if (typeof current[name] === 'function') crosswordApi[name] = current[name];
    });
  }

  /*
   * Both the crossword and Explore Games use window.ExploreGames.
   * A later assignment such as window.ExploreGames = {...} used to erase
   * the crossword methods and caused:
   *   startElectronicsCrossword is not a function
   *
   * Keep the two game APIs merged regardless of script load order.
   */
  function installExploreGamesBridge() {
    if (window[API_FLAG]) return;

    captureCrosswordApi();
    exploreGamesBacking = window.ExploreGames || {};

    try {
      Object.defineProperty(window, 'ExploreGames', {
        configurable: true,
        enumerable: true,
        get() {
          return exploreGamesBacking;
        },
        set(nextValue) {
          const next = nextValue && typeof nextValue === 'object' ? nextValue : {};
          exploreGamesBacking = Object.assign({}, next, crosswordApi);
        }
      });

      exploreGamesBacking = Object.assign({}, exploreGamesBacking, crosswordApi);
      window[API_FLAG] = true;
    } catch (_) {
      window[API_FLAG] = true;
      ensureExploreGamesApi();
    }
  }

  function ensureExploreGamesApi() {
    captureCrosswordApi();

    if (!window.ExploreGames || typeof window.ExploreGames !== 'object') {
      try { window.ExploreGames = {}; } catch (_) { return; }
    }

    API_METHODS.forEach(name => {
      if (typeof crosswordApi[name] === 'function' && typeof window.ExploreGames[name] !== 'function') {
        try { window.ExploreGames[name] = crosswordApi[name]; } catch (_) {}
      }
    });
  }

  function loadOriginal() {
    const existing = document.querySelector('script[data-ece-crossword-original]');
    if (existing) {
      captureCrosswordApi();
      installExploreGamesBridge();
      ensureExploreGamesApi();
      installPatch();
      return;
    }

    const script = document.createElement('script');
    script.src = `${ORIGINAL}?v=locked-cell-fix-2`;
    script.async = false;
    script.dataset.eceCrosswordOriginal = 'true';
    script.addEventListener('load', () => {
      captureCrosswordApi();
      installExploreGamesBridge();
      ensureExploreGamesApi();
      installPatch();
    }, { once: true });
    document.head.appendChild(script);
  }

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
      const editable = wordCells(clue).find(cell => !cell.classList.contains('locked'));
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
    if (next) return selectCell(next);
    return false;
  }

  function installPatch() {
    if (window.__eceCrosswordLockedCellPatchInstalled) return;
    window.__eceCrosswordLockedCellPatchInstalled = true;

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
      if (!board()) return;
      if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;

      const selected = selectedCell();
      if (!selected) return;

      const clue = activeClue();
      const isLetter = /^[a-zA-Z]$/.test(event.key);
      const isBackspace = event.key === 'Backspace';

      if (selected.classList.contains('locked') && (isLetter || isBackspace)) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const next = isBackspace
          ? nextUnlockedInWord(selected, clue, true) || nextUnlockedClueCell(clue)
          : nextUnlockedInWord(selected, clue, false) || nextUnlockedClueCell(clue);

        if (next) next.click();
        return;
      }

      if (isLetter || isBackspace) {
        setTimeout(redirectLockedSelection, 0);
      }
    }, true);

    const observer = new MutationObserver(() => {
      if (!board()) return;
      requestAnimationFrame(redirectLockedSelection);
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class']
    });

    const apiSync = setInterval(() => ensureExploreGamesApi(), 100);
    setTimeout(() => clearInterval(apiSync), 15000);

    const boardWait = setInterval(() => {
      ensureExploreGamesApi();
      if (board()) {
        clearInterval(boardWait);
        redirectLockedSelection();
      }
    }, 100);
    setTimeout(() => clearInterval(boardWait), 15000);
  }

  loadOriginal();
})();
