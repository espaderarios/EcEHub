/* EcE Hub — Electronics Crossword runtime bridge
 *
 * The real crossword implementation is kept at a known-good commit.
 * We load that runtime through jsDelivr instead of raw.githubusercontent.com.
 * raw.githubusercontent.com was failing in the deployed app, which left
 * window.ExploreGames.startElectronicsCrossword undefined.
 */
(function () {
  'use strict';

  const RUNTIME = 'https://cdn.jsdelivr.net/gh/espaderarios/EcEHub@7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';
  const FLAG = '__eceCrosswordRuntimeBridgeInstalled';
  const GUARD_FLAG = '__eceCrosswordLockedCellGuardInstalled';
  const API_METHODS = [
    'electronicsCrosswordView',
    'startElectronicsCrossword',
    'submitElectronicsCrossword',
    'clearElectronicsCrossword',
    'exitElectronicsCrossword'
  ];

  if (window[FLAG]) return;
  window[FLAG] = true;

  let backing = window.ExploreGames && typeof window.ExploreGames === 'object'
    ? window.ExploreGames
    : {};
  const crosswordApi = {};
  const pending = [];
  let loading = false;
  let ready = false;

  const proxies = {};

  function captureRuntimeApi() {
    const current = backing;
    if (!current || typeof current !== 'object') return;

    API_METHODS.forEach(name => {
      const fn = current[name];
      if (typeof fn === 'function' && fn !== proxies[name]) {
        crosswordApi[name] = fn;
      }
    });
  }

  function merge(next) {
    const value = next && typeof next === 'object' ? next : {};
    backing = Object.assign({}, value, crosswordApi, proxies);
  }

  function flushPending() {
    if (!ready) return;

    while (pending.length) {
      const job = pending.shift();
      const fn = crosswordApi[job.name];
      if (typeof fn !== 'function') continue;

      try {
        fn.apply(backing, job.args);
      } catch (error) {
        console.error(`EcE Hub crossword ${job.name} failed:`, error);
      }
    }
  }

  /*
   * The crossword runtime tracks locked words internally.  A crossing cell,
   * however, can belong to one locked word and one still-editable word. The
   * runtime's original input guard therefore only protected the locked word,
   * not the already-correct cell itself.
   *
   * This DOM-level guard makes the visual .locked state authoritative:
   * - typing on a locked cell skips it before the runtime receives the key;
   * - backspace also skips locked cells;
   * - after normal typing/navigation, if the runtime lands on a locked cell,
   *   focus is immediately moved to the next editable square;
   * - the existing runtime remains responsible for validation and locking.
   */
  function installLockedCellGuard() {
    if (window[GUARD_FLAG]) return;
    window[GUARD_FLAG] = true;

    const getSelectedCell = () => document.querySelector('#electronicsCrosswordBoard .electronics-crossword-cell.selected');

    const getWordCells = () => {
      const cells = Array.from(document.querySelectorAll('#electronicsCrosswordBoard .electronics-crossword-cell.word-selected'));
      const activeClue = document.querySelector('#electronicsCrosswordAcross .electronics-crossword-clue.active, #electronicsCrosswordDown .electronics-crossword-clue.active');
      const direction = activeClue?.dataset?.direction || 'across';

      return cells.sort((a, b) => {
        const ar = Number(a.dataset.row);
        const ac = Number(a.dataset.col);
        const br = Number(b.dataset.row);
        const bc = Number(b.dataset.col);
        return direction === 'down' ? (ar - br || ac - bc) : (ac - bc || ar - br);
      });
    };

    const clickNextEditable = (step = 1) => {
      const selected = getSelectedCell();
      const cells = getWordCells();

      if (selected && cells.length) {
        const index = cells.indexOf(selected);
        if (index >= 0) {
          for (let i = index + step; i >= 0 && i < cells.length; i += step) {
            if (!cells[i].classList.contains('locked')) {
              cells[i].click();
              return true;
            }
          }
        }
      }

      /* No editable square remains in this word: move to the next unsolved clue. */
      if (step > 0) {
        const clues = Array.from(document.querySelectorAll('.electronics-crossword-clue:not(.completed)'));
        const current = document.querySelector('.electronics-crossword-clue.active');
        const currentIndex = current ? clues.indexOf(current) : -1;
        const next = clues[currentIndex + 1] || clues[0];
        if (next) {
          next.click();
          return true;
        }
      }

      return false;
    };

    const jumpAwayFromLocked = (step = 1) => {
      const selected = getSelectedCell();
      if (!selected?.classList.contains('locked')) return false;
      return clickNextEditable(step);
    };

    /* Capture phase: change the selected square before the runtime's keydown handler. */
    document.addEventListener('keydown', event => {
      if (!document.getElementById('electronicsCrosswordBoard')) return;
      const selected = getSelectedCell();
      if (!selected?.classList.contains('locked')) return;

      if (/^[a-zA-Z]$/.test(event.key)) {
        /* Do not consume the letter. Move first; the runtime then enters it in the new cell. */
        jumpAwayFromLocked(1);
        return;
      }

      if (event.key === 'Backspace') {
        jumpAwayFromLocked(-1);
        return;
      }

      if (event.key === 'ArrowRight') { jumpAwayFromLocked(1); return; }
      if (event.key === 'ArrowDown') { jumpAwayFromLocked(1); return; }
      if (event.key === 'ArrowLeft') { jumpAwayFromLocked(-1); return; }
      if (event.key === 'ArrowUp') { jumpAwayFromLocked(-1); return; }
    }, true);

    /* Bubble phase: the runtime has now processed the letter/navigation. */
    document.addEventListener('keydown', event => {
      if (!document.getElementById('electronicsCrosswordBoard')) return;
      if (!(/^[a-zA-Z]$/.test(event.key) || event.key.startsWith('Arrow') || event.key === 'Backspace')) return;

      setTimeout(() => {
        jumpAwayFromLocked(1);
      }, 0);
    });

    /* Clicking a locked intersection is allowed for selection, but never leaves the user on it for editing. */
    document.addEventListener('click', () => {
      setTimeout(() => jumpAwayFromLocked(1), 0);
    });

    console.info('EcE Hub crossword locked-cell guard installed.');
  }

  function loadRuntime() {
    if (ready || loading || document.querySelector('script[data-ece-crossword-runtime]')) return;
    loading = true;

    const script = document.createElement('script');
    script.src = `${RUNTIME}?v=runtime-bridge-5`;
    script.async = false;
    script.dataset.eceCrosswordRuntime = 'true';

    script.addEventListener('load', () => {
      loading = false;
      captureRuntimeApi();
      ready = typeof crosswordApi.startElectronicsCrossword === 'function';
      merge(backing);
      installLockedCellGuard();

      if (!ready) {
        console.error('EcE Hub crossword runtime loaded, but startElectronicsCrossword was not exported.');
        return;
      }

      console.info('EcE Hub Electronics Crossword runtime loaded successfully.');
      flushPending();
    }, { once: true });

    script.addEventListener('error', () => {
      loading = false;
      console.error('EcE Hub could not load the crossword runtime:', RUNTIME);
      console.error('The crossword runtime is pinned to commit 7c8d09d5b34671844c3fe19dab39b25f9d42d1b0.');
      script.remove();
    }, { once: true });

    document.head.appendChild(script);
  }

  API_METHODS.forEach(name => {
    proxies[name] = function (...args) {
      const fn = crosswordApi[name];

      if (typeof fn === 'function') {
        try {
          return fn.apply(backing, args);
        } catch (error) {
          console.error(`EcE Hub crossword ${name} failed:`, error);
          throw error;
        }
      }

      pending.push({ name, args });
      loadRuntime();
      return undefined;
    };
  });

  try {
    Object.defineProperty(window, 'ExploreGames', {
      configurable: true,
      enumerable: true,
      get() {
        return backing;
      },
      set(next) {
        merge(next);
      }
    });
  } catch (error) {
    console.warn('EcE Hub crossword API bridge could not redefine ExploreGames:', error);
  }

  merge(backing);
  loadRuntime();

  console.info('EcE Hub crossword runtime bridge installed.');
})();
