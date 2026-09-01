/* ============================================================
   EcE Hub — Electronics Crossword runtime bridge
   Level 1 + Level 2
   ============================================================ */
(function () {
  'use strict';

  const RUNTIME_LEVEL1 =
    'https://cdn.jsdelivr.net/gh/espaderarios/EcEHub@7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';

  const RUNTIME_LEVEL2 =
    'https://cdn.jsdelivr.net/gh/espaderarios/EcEHub@5fba845aee00a6b0f1d69f90014a62292c999d02/electronics-crossword-level2.js';

  const FLAG = '__eceCrosswordRuntimeBridgeInstalled';
  const GUARD_FLAG = '__eceCrosswordLockedCellGuardInstalled';
  const AUTO_VALIDATE_FLAG = '__eceCrosswordAutoValidateInstalled';

  if (window[FLAG]) return;
  window[FLAG] = true;

  const API_METHODS = [
    'electronicsCrosswordView',
    'startElectronicsCrossword',
    'submitElectronicsCrossword',
    'clearElectronicsCrossword',
    'exitElectronicsCrossword',
    'startElectronicsCrosswordLevel2',
    'electronicsCrosswordLevel2View',
    'submitElectronicsCrosswordLevel2',
    'clearElectronicsCrosswordLevel2',
    'exitElectronicsCrosswordLevel2'
  ];

  let backing = window.ExploreGames && typeof window.ExploreGames === 'object'
    ? window.ExploreGames
    : {};

  const crosswordApi = {};
  const proxies = {};
  const pending = [];
  let loading = false;
  let loaded = false;
  let activeLevel = 1;

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

  function run(name, args = []) {
    const fn = crosswordApi[name];

    if (typeof fn !== 'function') {
      pending.push({ name, args });
      loadRuntimes();
      return undefined;
    }

    try {
      return fn.apply(backing, args);
    } catch (error) {
      console.error(`EcE Hub crossword ${name} failed:`, error);
      throw error;
    }
  }

  function level1View(...args) {
    const fn = crosswordApi.electronicsCrosswordView;
    return typeof fn === 'function' ? fn.apply(backing, args) : '';
  }

  function level2View(...args) {
    const fn = crosswordApi.electronicsCrosswordLevel2View;
    return typeof fn === 'function' ? fn.apply(backing, args) : '';
  }

  function flushPending() {
    if (!loaded) return;

    while (pending.length) {
      const job = pending.shift();
      run(job.name, job.args);
    }
  }

  function loadScript(src, key) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-ece-crossword-runtime="${key}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `${src}?v=crossword-${key}-2`;
      script.async = false;
      script.dataset.eceCrosswordRuntime = key;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadRuntimes() {
    if (loaded || loading) return;
    loading = true;

    try {
      await loadScript(RUNTIME_LEVEL1, 'level1');
      captureRuntimeApi();

      await loadScript(RUNTIME_LEVEL2, 'level2');
      captureRuntimeApi();

      loaded = true;
      loading = false;
      merge(backing);
      installLockedCellGuard();
      installAutoValidation();
      installLevel2Launcher();

      console.info('EcE Hub Electronics Crossword Level 1 + Level 2 runtimes loaded.');
      flushPending();
    } catch (error) {
      loading = false;
      console.error('EcE Hub could not load a crossword runtime.', error);
    }
  }

  function installLevel2Launcher() {
    if (window.__eceCrosswordLevel2LauncherInstalled) return;
    window.__eceCrosswordLevel2LauncherInstalled = true;

    const mount = () => {
      const tools = document.querySelector('.electronics-crossword-board-tools');
      if (!tools || tools.querySelector('[data-ece-crossword-level2]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'electronics-crossword-icon-btn';
      button.dataset.eceCrosswordLevel2 = 'true';
      button.textContent = 'Level 2';
      button.title = 'Open Electronics Crossword Level 2';

      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof window.ExploreGames?.startElectronicsCrosswordLevel2 === 'function') {
          window.ExploreGames.startElectronicsCrosswordLevel2();
        }
      });

      tools.insertBefore(button, tools.lastElementChild || null);
    };

    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    mount();
  }

  function installAutoValidation() {
    if (window[AUTO_VALIDATE_FLAG]) return;
    window[AUTO_VALIDATE_FLAG] = true;

    /*
     * Level 2 originally validates only the entry that receives the final
     * typed letter. That misses a crossing word whose final letter was
     * supplied by another already-selected direction.
     *
     * The Level 2 submit/check routine already does exactly what we need:
     * it validates every entry that is completely filled, while leaving
     * incomplete entries alone. Running it after a key is released therefore
     * makes a crossing word validate as soon as it becomes complete.
     */
    document.addEventListener('keyup', event => {
      if (activeLevel !== 2) return;
      if (!document.querySelector('.electronics-crossword-level2')) return;
      if (!/^[a-zA-Z]$/.test(event.key)) return;

      setTimeout(() => {
        if (activeLevel !== 2) return;
        if (!document.querySelector('.electronics-crossword-level2')) return;

        const fn = crosswordApi.submitElectronicsCrosswordLevel2;
        if (typeof fn !== 'function') return;

        try {
          fn.apply(backing, []);
        } catch (error) {
          console.error('EcE Hub Level 2 automatic validation failed:', error);
        }
      }, 0);
    });

    console.info('EcE Hub Level 2 automatic cross-word validation installed.');
  }

  function installLockedCellGuard() {
    if (window[GUARD_FLAG]) return;
    window[GUARD_FLAG] = true;

    const getSelectedCell = () =>
      document.querySelector('#electronicsCrosswordBoard .electronics-crossword-cell.selected');

    const getWordCells = () => {
      const cells = Array.from(
        document.querySelectorAll('#electronicsCrosswordBoard .electronics-crossword-cell.word-selected')
      );
      const activeClue = document.querySelector(
        '#electronicsCrosswordAcross .electronics-crossword-clue.active, ' +
        '#electronicsCrosswordDown .electronics-crossword-clue.active'
      );
      const direction = activeClue?.dataset?.direction || 'across';

      return cells.sort((a, b) => {
        const ar = Number(a.dataset.row);
        const ac = Number(a.dataset.col);
        const br = Number(b.dataset.row);
        const bc = Number(b.dataset.col);
        return direction === 'down'
          ? (ar - br || ac - bc)
          : (ac - bc || ar - br);
      });
    };

    const jumpAwayFromLocked = (step = 1) => {
      const selected = getSelectedCell();
      if (!selected?.classList.contains('locked')) return false;

      const cells = getWordCells();
      const index = cells.indexOf(selected);
      if (index < 0) return false;

      for (let i = index + step; i >= 0 && i < cells.length; i += step) {
        if (!cells[i].classList.contains('locked')) {
          cells[i].click();
          return true;
        }
      }

      if (step > 0) {
        const clues = Array.from(
          document.querySelectorAll('.electronics-crossword-clue:not(.completed)')
        );
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

    document.addEventListener('keydown', event => {
      if (!document.getElementById('electronicsCrosswordBoard')) return;

      const selected = getSelectedCell();
      if (!selected?.classList.contains('locked')) return;

      if (/^[a-zA-Z]$/.test(event.key)) {
        jumpAwayFromLocked(1);
        return;
      }

      if (event.key === 'Backspace') {
        jumpAwayFromLocked(-1);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        jumpAwayFromLocked(1);
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        jumpAwayFromLocked(-1);
      }
    }, true);

    document.addEventListener('click', () => {
      setTimeout(() => jumpAwayFromLocked(1), 0);
    });

    console.info('EcE Hub crossword locked-cell guard installed.');
  }

  proxies.startElectronicsCrossword = function (...args) {
    activeLevel = 1;
    return run('startElectronicsCrossword', args);
  };

  proxies.startElectronicsCrosswordLevel2 = function (...args) {
    activeLevel = 2;
    return run('startElectronicsCrosswordLevel2', args);
  };

  proxies.electronicsCrosswordView = function (...args) {
    return activeLevel === 2
      ? level2View(...args)
      : level1View(...args);
  };

  [
    'submitElectronicsCrossword',
    'clearElectronicsCrossword',
    'exitElectronicsCrossword',
    'submitElectronicsCrosswordLevel2',
    'clearElectronicsCrosswordLevel2',
    'exitElectronicsCrosswordLevel2'
  ].forEach(name => {
    proxies[name] = function (...args) {
      return run(name, args);
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
  loadRuntimes();

  console.info('EcE Hub crossword runtime bridge installed.');
})();
