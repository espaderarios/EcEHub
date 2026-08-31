/* EcE Hub — Electronics Crossword loader + locked-cell behavior
 *
 * IMPORTANT: this file must expose the crossword API immediately.
 * app.js can call startElectronicsCrossword before the original crossword
 * script has finished loading. We therefore install a permanent
 * window.ExploreGames bridge first, then load the stable crossword runtime.
 */
(function () {
  'use strict';

  const ORIGINAL = 'https://raw.githubusercontent.com/espaderarios/EcEHub/7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';
  const FLAG = '__eceCrosswordLoaderInstalled';
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

  let backing = window.ExploreGames && typeof window.ExploreGames === 'object'
    ? window.ExploreGames
    : {};
  let crosswordApi = {};
  let ready = false;
  const pending = [];

  function capture() {
    const current = backing;
    if (!current || typeof current !== 'object') return;
    API_METHODS.forEach(name => {
      if (typeof current[name] === 'function' && current[name] !== proxies[name]) {
        crosswordApi[name] = current[name];
      }
    });
  }

  function runWhenReady(name, args) {
    const fn = crosswordApi[name];
    if (typeof fn === 'function') {
      try { return fn.apply(backing, args); } catch (error) {
        console.error(`EcE Hub crossword ${name} failed:`, error);
        throw error;
      }
    }

    pending.push({ name, args });
    loadOriginal();
    return undefined;
  }

  const proxies = {};
  API_METHODS.forEach(name => {
    proxies[name] = function (...args) {
      return runWhenReady(name, args);
    };
  });

  function merge(next) {
    const value = next && typeof next === 'object' ? next : {};
    backing = Object.assign({}, value, crosswordApi, proxies);
  }

  /* Install this BEFORE loading the original runtime. */
  try {
    Object.defineProperty(window, 'ExploreGames', {
      configurable: true,
      enumerable: true,
      get() { return backing; },
      set(next) { merge(next); }
    });
  } catch (error) {
    console.warn('EcE Hub crossword API bridge could not redefine ExploreGames:', error);
  }

  merge(backing);

  function flushPending() {
    if (!ready) return;
    while (pending.length) {
      const job = pending.shift();
      const fn = crosswordApi[job.name];
      if (typeof fn === 'function') {
        try { fn.apply(backing, job.args); } catch (error) {
          console.error(`EcE Hub queued crossword ${job.name} failed:`, error);
        }
      }
    }
  }

  function loadOriginal() {
    if (ready || document.querySelector('script[data-ece-crossword-original]')) return;

    const script = document.createElement('script');
    script.src = `${ORIGINAL}?v=api-race-fix-3`;
    script.async = false;
    script.dataset.eceCrosswordOriginal = 'true';

    script.addEventListener('load', () => {
      capture();
      ready = Object.keys(crosswordApi).length > 0;
      merge(backing);
      flushPending();
      installLockedCellPatch();
      console.info('EcE Hub crossword runtime loaded; ExploreGames API ready.');
    }, { once: true });

    script.addEventListener('error', () => {
      console.error('EcE Hub could not load the crossword runtime:', ORIGINAL);
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
      const cell = wordCells(clue).find(c => !c.classList.contains('locked'));
      if (cell) return cell;
    }
    return null;
  }

  function moveToNextEditable(fromCell, backwards) {
    const clue = activeClue();
    const next = nextUnlockedInWord(fromCell, clue, backwards) || nextUnlockedClueCell(clue);
    if (next && !next.classList.contains('locked')) next.click();
  }

  function redirectLockedSelection() {
    const selected = selectedCell();
    if (!selected || !selected.classList.contains('locked')) return;
    moveToNextEditable(selected, false);
  }

  function installLockedCellPatch() {
    if (window.__eceCrosswordLockedCellPatchInstalled) return;
    window.__eceCrosswordLockedCellPatchInstalled = true;

    /* A locked cell is never selectable for editing. Clicking it advances. */
    document.addEventListener('click', event => {
      const cell = event.target.closest?.('#electronicsCrosswordBoard .electronics-crossword-cell');
      if (!cell || !cell.classList.contains('locked')) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      moveToNextEditable(cell, false);
    }, true);

    /* Keyboard entry skips locked cells in either Across or Down. */
    document.addEventListener('keydown', event => {
      if (!board()) return;
      if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA' || event.target?.isContentEditable) return;

      const selected = selectedCell();
      if (!selected) return;

      const letter = /^[a-zA-Z]$/.test(event.key);
      const backspace = event.key === 'Backspace';

      if (selected.classList.contains('locked') && (letter || backspace)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        moveToNextEditable(selected, backspace);
        return;
      }

      if (letter || backspace) {
        setTimeout(redirectLockedSelection, 0);
      }
    }, true);

    /* The crossword rerenders its cells. Re-assert the locked-cell rule after each render. */
    const observer = new MutationObserver(() => {
      if (board()) requestAnimationFrame(redirectLockedSelection);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /* Expose the API immediately, then load the real crossword implementation. */
  loadOriginal();
})();
