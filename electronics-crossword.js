/* ============================================================
   EcE Hub — Electronics Crossword (combined + fixed)
   ============================================================ */

/* ============================================================
   1. Runtime bridge  (FIXED – Level 2 methods are now captured)
   ============================================================ */
(function () {
  'use strict';

  const RUNTIME_LEVEL1 =
    'https://cdn.jsdelivr.net/gh/espaderarios/EcEHub@7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';

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

  let backing = (window.ExploreGames && typeof window.ExploreGames === 'object')
    ? window.ExploreGames
    : (window.ExploreGames = {});

  // Real implementations only (never proxies)
  const crosswordApi = {};
  // Public-facing wrappers
  const proxies = {};
  const pending = [];
  let loading = false;
  let loaded = false;
  let activeLevel = window.__eceCrosswordActiveLevel === 2 ? 2 : 0;

  function isProxy(fn) {
    return Object.values(proxies).includes(fn);
  }

  function captureRuntimeApi() {
    backing = window.ExploreGames || (window.ExploreGames = {});

    API_METHODS.forEach(name => {
      const fn = backing[name] || window[name];
      if (typeof fn === 'function' && !isProxy(fn) && fn !== crosswordApi[name]) {
        crosswordApi[name] = fn;
      }
    });
  }

  function merge(next) {
    backing = window.ExploreGames || (window.ExploreGames = {});
    const value = (next && typeof next === 'object') ? next : backing;

    // Keep real implementations separate from proxies
    const real = {};
    Object.keys(value).forEach(key => {
      if (!isProxy(value[key])) {
        real[key] = value[key];
      }
    });

    // Rebuild the live runtime object instead of creating a stale clone.
    // Never copy proxy wrappers back into the runtime object, or they recurse.
    Object.assign(backing, real, crosswordApi);
    captureRuntimeApi();
  }

  function restorePublicEntryPoints() {
    backing = window.ExploreGames || (window.ExploreGames = {});
    backing.startElectronicsCrossword = proxies.startElectronicsCrossword;
    backing.electronicsCrosswordView = proxies.electronicsCrosswordView;
    backing.startElectronicsCrosswordLevel1 = startLevel1;
    window.startElectronicsCrossword = proxies.startElectronicsCrossword;
    window.electronicsCrosswordView = proxies.electronicsCrosswordView;
    window.startElectronicsCrosswordLevel1 = startLevel1;
  }

  function startLevel1(...args) {
    activeLevel = 1;
    window.__eceCrosswordActiveLevel = 1;
    return run('startElectronicsCrossword', args);
  }

  function run(name, args = []) {
    const runtimeFn = (window.ExploreGames && window.ExploreGames[name] && !isProxy(window.ExploreGames[name]))
      ? window.ExploreGames[name]
      : null;
    const fn = runtimeFn || crosswordApi[name];

    if (typeof fn !== 'function') {
      if (name === 'startElectronicsCrossword' && typeof window.startElectronicsCrosswordLevel2 === 'function') {
        return window.startElectronicsCrosswordLevel2.apply(window.ExploreGames || window, args);
      }

      if (name === 'electronicsCrosswordView' && typeof window.electronicsCrosswordLevel2View === 'function') {
        return window.electronicsCrosswordLevel2View.apply(window.ExploreGames || window, args);
      }

      pending.push({ name, args });
      loadRuntimes();
      captureRuntimeApi();
      const retry = (window.ExploreGames && window.ExploreGames[name]) || crosswordApi[name];
      if (typeof retry === 'function') {
        return retry.apply(window.ExploreGames || backing, args);
      }
      return undefined;
    }

    try {
      return fn.apply(window.ExploreGames || backing, args);
    } catch (error) {
      console.error(`EcE Hub crossword ${name} failed:`, error);
      throw error;
    }
  }

  function level1View(...args) {
    const fn = crosswordApi.electronicsCrosswordView || window.electronicsCrosswordLevel2View;
    return typeof fn === 'function' ? fn.apply(window.ExploreGames || backing, args) : '';
  }

  function level2View(...args) {
    const fn = crosswordApi.electronicsCrosswordLevel2View || window.electronicsCrosswordLevel2View;
    return typeof fn === 'function' ? fn.apply(window.ExploreGames || backing, args) : '';
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
      script.src = `${src}?v=crossword-${key}-7`;
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

      loaded = true;
      loading = false;
      merge(backing);
      restorePublicEntryPoints();
      installLockedCellGuard();
      installAutoValidation();

      // Level 2 may already be present
      setTimeout(captureRuntimeApi, 50);

      console.info('EcE Hub Electronics Crossword Level 1 runtime loaded (Level 2 is local).');
      flushPending();
    } catch (error) {
      loading = false;
      console.error('EcE Hub could not load a crossword runtime.', error);
    }
  }

  function installLevel2Launcher() {
    if (window.__eceCrosswordLevel2LauncherInstalled) return;
    window.__eceCrosswordLevel2LauncherInstalled = true;

    const findHost = () => {
      const candidates = [
        '.electronics-crossword-board-tools',
        '.electronics-crossword-actions',
        '.electronics-crossword-header',
        '.electronics-crossword-page',
        '#content',
        'body'
      ];

      for (const selector of candidates) {
        const node = document.querySelector(selector);
        if (node) return node;
      }
      return document.body;
    };

    const mount = () => {
      if (document.querySelector('.cw-level-map')) return;
      const host = findHost();
      if (!host || host.querySelector('[data-ece-crossword-level2]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'electronics-crossword-icon-btn';
      button.dataset.eceCrosswordLevel2 = 'true';
      button.textContent = 'Level 2';
      button.title = 'Open Electronics Crossword Level 2';
      button.style.cssText = 'margin:12px 0 0; padding:8px 12px; border:1px solid #dbe3ef; border-radius:10px; background:#fff; color:#12213b; font-weight:700; cursor:pointer;';

      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        captureRuntimeApi();

        const getStart = () => {
          const fromApi = crosswordApi.startElectronicsCrosswordLevel2;
          const fromRuntime = window.ExploreGames && window.ExploreGames.startElectronicsCrosswordLevel2;
          const fromGlobal = typeof window.startElectronicsCrosswordLevel2 === 'function'
            ? window.startElectronicsCrosswordLevel2
            : null;
          return typeof fromApi === 'function' ? fromApi : (typeof fromRuntime === 'function' ? fromRuntime : fromGlobal);
        };

        const attempt = () => {
          const fn = getStart();
          if (typeof fn === 'function') {
            activeLevel = 2;
            fn.apply(window.ExploreGames || backing, []);
            return true;
          }
          return false;
        };

        if (attempt()) return;

        console.warn('Level 2 not ready yet, retrying…');
        let attempts = 0;
        const retry = () => {
          attempts += 1;
          captureRuntimeApi();
          if (attempt()) return;
          if (attempts < 20) {
            setTimeout(retry, 150);
          } else {
            console.error('Level 2 start function still not found.');
          }
        };
        retry();
      });

      if (host === document.body) {
        document.body.appendChild(button);
      } else {
        host.insertBefore(button, host.lastElementChild || null);
      }
    };

    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    mount();
  }

  function installAutoValidation() {
    if (window[AUTO_VALIDATE_FLAG]) return;
    window[AUTO_VALIDATE_FLAG] = true;

    document.addEventListener('keyup', event => {
      if (activeLevel !== 2) return;
      if (!document.querySelector('.electronics-crossword-level2')) return;
      if (!/^[a-zA-Z]$/.test(event.key)) return;

      setTimeout(() => {
        if (activeLevel !== 2) return;
        const fn = crosswordApi.submitElectronicsCrosswordLevel2;
        if (typeof fn === 'function') {
          try { fn.apply(backing, []); } catch (e) {
            console.error('EcE Hub Level 2 automatic validation failed:', e);
          }
        }
      }, 0);
    });
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
      return false;
    };

    document.addEventListener('keydown', event => {
      if (!document.getElementById('electronicsCrosswordBoard')) return;
      const selected = getSelectedCell();
      if (!selected?.classList.contains('locked')) return;

      if (/^[a-zA-Z]$/.test(event.key)) { jumpAwayFromLocked(1); return; }
      if (event.key === 'Backspace') { jumpAwayFromLocked(-1); return; }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { jumpAwayFromLocked(1); return; }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { jumpAwayFromLocked(-1); return; }
    }, true);

    document.addEventListener('click', () => {
      setTimeout(() => jumpAwayFromLocked(1), 0);
    });
  }

  // ---------- Proxies (public API) ----------
  proxies.startElectronicsCrossword = function (...args) {
    activeLevel = 0;
    window.__eceCrosswordActiveLevel = 0;
    if (typeof window.startElectronicsCrosswordLevels === 'function') {
      return window.startElectronicsCrosswordLevels.apply(window.ExploreGames || window, args);
    }
    if (typeof window.startElectronicsCrosswordLevel2 === 'function') {
      return window.startElectronicsCrosswordLevel2.apply(window.ExploreGames || window, args);
    }
    return run('startElectronicsCrossword', args);
  };

  proxies.startElectronicsCrosswordLevel2 = function (...args) {
    activeLevel = 2;
    window.__eceCrosswordActiveLevel = 2;
    captureRuntimeApi();
    if (typeof window.startElectronicsCrosswordLevel2 === 'function') {
      return window.startElectronicsCrosswordLevel2.apply(window.ExploreGames || window, args);
    }
    return run('startElectronicsCrosswordLevel2', args);
  };

  proxies.electronicsCrosswordView = function (...args) {
    if ([0, 1, 2, 3].includes(window.__eceCrosswordActiveLevel)) {
      activeLevel = window.__eceCrosswordActiveLevel;
    }
    if (activeLevel === 0 && typeof window.electronicsCrosswordLevelsView === 'function') {
      return window.electronicsCrosswordLevelsView.apply(window.ExploreGames || window, args);
    }
    if (activeLevel >= 1 && typeof window.electronicsCrosswordLevel3View === 'function') {
      return window.electronicsCrosswordLevel3View.apply(window.ExploreGames || window, args);
    }
    return activeLevel === 2 ? level2View(...args) : level1View(...args);
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

  // Make ExploreGames a stable live object without recursive getter traps.
  try {
    if (!window.ExploreGames || typeof window.ExploreGames !== 'object') {
      window.ExploreGames = {};
    }
    window.ExploreGames.__eceCrosswordRuntimeBridge = true;
    backing = window.ExploreGames;
  } catch (error) {
    console.warn('EcE Hub crossword API bridge could not stabilize ExploreGames:', error);
  }

  // Initial merge + start loading
  merge(backing);
  loadRuntimes();

  console.info('EcE Hub crossword runtime bridge installed.');
})();


/* ============================================================
   2. Level 2 full implementation (local)  – unchanged
   ============================================================ */
(function () {
  'use strict';

  const ROWS = 17;
  const COLS = 17;
  const ENTRIES = [
    { number: 10, answer: 'OSCILLATOR', clue: 'A circuit that generates a periodic electrical signal.', row: 8, col: 3, direction: 'across' },
    { number: 3, answer: 'FREQUENCY', clue: 'The number of complete cycles of a periodic signal occurring per second.', row: 1, col: 5, direction: 'down' },
    { number: 9, answer: 'BANDWIDTH', clue: 'The range of frequencies that a communication channel or system can effectively pass.', row: 7, col: 9, direction: 'down' },
    { number: 12, answer: 'IMPEDANCE', clue: 'The total opposition a circuit presents to alternating current, combining resistance and reactance.', row: 13, col: 5, direction: 'across' },
    { number: 2, answer: 'AMPLIFIER', clue: 'A circuit or device that increases the amplitude of an electrical signal.', row: 1, col: 0, direction: 'across' },
    { number: 1, answer: 'RECTIFIER', clue: 'A circuit that converts alternating current into unidirectional current.', row: 0, col: 12, direction: 'down' },
    { number: 6, answer: 'RESONANCE', clue: 'The condition in which a system responds strongly at a particular frequency.', row: 5, col: 3, direction: 'down' },
    { number: 13, answer: 'KIRCHHOFF', clue: 'The surname associated with the circuit laws for current and voltage at electrical junctions and loops.', row: 15, col: 5, direction: 'across' },
    { number: 11, answer: 'INDUCTOR', clue: 'A passive component that stores energy in a magnetic field.', row: 10, col: 7, direction: 'across' },
    { number: 4, answer: 'PHASE', clue: 'The relative position of a periodic waveform within its cycle.', row: 3, col: 1, direction: 'across' },
    { number: 7, answer: 'THEVENIN', clue: 'The surname in a theorem that replaces a linear two-terminal network with an equivalent voltage source and resistance.', row: 6, col: 1, direction: 'across' },
    { number: 5, answer: 'MOSFET', clue: 'A voltage-controlled transistor widely used for switching and amplification.', row: 3, col: 7, direction: 'across' },
    { number: 8, answer: 'DIODE', clue: 'A semiconductor device that primarily allows current to flow in one direction.', row: 6, col: 11, direction: 'across' }
  ];

  let state = null;
  let installed = false;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
    );
  }

  function cellsFor(entry) {
    const cells = [];
    const dr = entry.direction === 'down' ? 1 : 0;
    const dc = entry.direction === 'across' ? 1 : 0;
    for (let i = 0; i < entry.answer.length; i++) {
      cells.push({ row: entry.row + dr * i, col: entry.col + dc * i });
    }
    return cells;
  }

  function buildBoard() {
    const board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
    const starts = new Map();
    ENTRIES.forEach((entry, index) => {
      starts.set(`${entry.row}:${entry.col}`, entry.number);
      cellsFor(entry).forEach((cell, i) => {
        board[cell.row][cell.col] = {
          answer: entry.answer[i],
          entryIndexes: [...(board[cell.row][cell.col]?.entryIndexes || []), index],
          row: cell.row,
          col: cell.col
        };
      });
    });
    return { board, starts };
  }

  function reset() {
    const { board, starts } = buildBoard();
    state = {
      board,
      starts,
      values: Array.from({ length: ROWS }, () => Array(COLS).fill('')),
      locked: new Set(),
      completed: new Set(),
      activeEntry: 0,
      selected: null,
      errorEntry: null,
      message: 'Fill in each word. Level 2 uses more advanced electronics terminology.'
    };
  }

  function entryCells(index) { return cellsFor(ENTRIES[index]); }

  function entryIsComplete(index) {
    return entryCells(index).every(c => state.values[c.row][c.col]);
  }

  function entryWord(index) {
    return entryCells(index).map(c => state.values[c.row][c.col] || '').join('');
  }

  function lockEntry(index) {
    entryCells(index).forEach(c => state.locked.add(`${c.row}:${c.col}`));
    state.completed.add(index);
  }

  function nextEditableCell(index, fromOffset = -1) {
    const cells = entryCells(index);
    for (let i = fromOffset + 1; i < cells.length; i++) {
      if (!state.locked.has(`${cells[i].row}:${cells[i].col}`)) return cells[i];
    }

    const ordered = ENTRIES
      .map((entry, entryIndex) => ({ entry, entryIndex }))
      .sort((a, b) => a.entry.number - b.entry.number);

    const currentPosition = ordered.findIndex(item => item.entryIndex === index);
    for (let step = 1; step <= ordered.length; step++) {
      const candidate = ordered[(currentPosition + step + ordered.length) % ordered.length];
      if (state.completed.has(candidate.entryIndex)) continue;

      const cell = entryCells(candidate.entryIndex)
        .find(c => !state.locked.has(`${c.row}:${c.col}`));
      if (cell) {
        state.activeEntry = candidate.entryIndex;
        return cell;
      }
    }
    return null;
  }

  function selectEntry(index, preferredCell = null) {
    if (!state) reset();
    if (!Number.isInteger(index) || !ENTRIES[index]) return;
    state.activeEntry = index;
    const cells = entryCells(index);
    const cell = preferredCell || cells.find(c => !state.locked.has(`${c.row}:${c.col}`)) || null;
    state.selected = cell;
    state.errorEntry = null;
    state.message = `${ENTRIES[index].number} ${ENTRIES[index].direction === 'across' ? 'Across' : 'Down'} selected.`;
  }

  function selectCell(row, col) {
    if (!state?.board[row]?.[col]) return;
    const cell = state.board[row][col];
    const indexes = cell.entryIndexes || [];
    if (!indexes.length) return;

    let index = indexes.includes(state.activeEntry) ? state.activeEntry : indexes[0];
    if (state.selected && state.selected.row === row && state.selected.col === col && indexes.length > 1) {
      index = indexes[(indexes.indexOf(index) + 1) % indexes.length];
    }
    selectEntry(index, { row, col });

    if (state.locked.has(`${row}:${col}`)) {
      const next = nextEditableCell(
        index,
        entryCells(index).findIndex(c => c.row === row && c.col === col)
      );
      state.selected = next || null;
    }
  }

  function validateEntry(index) {
    if (state.completed.has(index)) return true;
    if (!entryIsComplete(index)) return false;

    const correct = entryWord(index) === ENTRIES[index].answer;
    if (correct) {
      lockEntry(index);
      state.errorEntry = null;
      state.message = `${ENTRIES[index].number} ${ENTRIES[index].direction === 'across' ? 'Across' : 'Down'} is correct and locked. Choose any clue to continue.`;
      state.selected = null;
      return true;
    }

    state.errorEntry = index;
    state.message = `Not quite — check ${ENTRIES[index].number} ${ENTRIES[index].direction === 'across' ? 'Across' : 'Down'} and try again.`;
    return false;
  }

  function inputLetter(letter) {
    if (!state?.selected) return;

    let cell = state.selected;
    if (state.locked.has(`${cell.row}:${cell.col}`)) {
      cell = nextEditableCell(
        state.activeEntry,
        entryCells(state.activeEntry).findIndex(c => c.row === cell.row && c.col === cell.col)
      );
      if (!cell) {
        state.selected = null;
        render();
        return;
      }
      state.selected = cell;
    }

    state.values[cell.row][cell.col] = letter.toUpperCase();
    const cells = entryCells(state.activeEntry);
    const offset = cells.findIndex(c => c.row === cell.row && c.col === cell.col);

    if (offset === cells.length - 1) {
      validateEntry(state.activeEntry);
      if (!state.completed.has(state.activeEntry)) state.selected = cell;
    } else {
      state.selected = nextEditableCell(state.activeEntry, offset);
    }
    render();
  }

  function backspace() {
    if (!state?.selected) return;
    const cells = entryCells(state.activeEntry);
    const offset = cells.findIndex(c => c.row === state.selected.row && c.col === state.selected.col);

    for (let i = offset; i >= 0; i--) {
      const c = cells[i];
      if (!state.locked.has(`${c.row}:${c.col}`)) {
        if (state.values[c.row][c.col]) state.values[c.row][c.col] = '';
        state.selected = c;
        break;
      }
    }
    render();
  }

  function arrow(delta) {
    if (!state?.selected) return;
    const cells = entryCells(state.activeEntry);
    const offset = cells.findIndex(c => c.row === state.selected.row && c.col === state.selected.col);
    const next = cells[offset + delta];

    if (next) {
      state.selected = next;
      if (state.locked.has(`${next.row}:${next.col}`)) {
        state.selected = nextEditableCell(
          state.activeEntry,
          offset + (delta > 0 ? 0 : -2)
        ) || null;
      }
      render();
    }
  }

  function clear() {
    if (!state) reset();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!state.locked.has(`${r}:${c}`)) state.values[r][c] = '';
      }
    }
    state.errorEntry = null;
    state.message = 'Unlocked letters cleared. Correct words remain locked.';
    render();
  }

  function checkAll() {
    ENTRIES.forEach((_, i) => {
      if (!state.completed.has(i) && entryIsComplete(i)) validateEntry(i);
    });
    render();
  }

  function fullscreen() {
    const el = document.querySelector('.electronics-crossword-level2');
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  function exit() {
    state = null;
    window.__eceCrosswordActiveLevel = 0;
    if (typeof window.go === 'function') window.go('explore-crossword');
  }

  function switchLevel1() {
    if (typeof window.ExploreGames?.startElectronicsCrossword === 'function') {
      window.ExploreGames.startElectronicsCrossword();
    }
  }

  function handleClick(event) {
    const mapAction = event.target.closest?.('[data-cw-map-action]')?.dataset?.cwMapAction;
    if (mapAction === 'exit') {
      if (typeof window.go === 'function') window.go('explore');
      return;
    }

    const level1Exit = event.target.closest?.('[data-action="exit-electronics-crossword"]');
    if (level1Exit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.__eceCrosswordActiveLevel = 0;
      if (typeof window.startElectronicsCrosswordLevels === 'function') {
        window.startElectronicsCrosswordLevels();
      }
      return;
    }

    const levelButton = event.target.closest?.('[data-cw-level]');
    if (levelButton) {
      const level = Number(levelButton.dataset.cwLevel);
      if (levelButton.disabled) return;
      if (level >= 1 && typeof window.startElectronicsCrosswordLevel3 === 'function') {
        window.startElectronicsCrosswordLevel3(level);
      }
      return;
    }

    const cell = event.target.closest?.('[data-cw2-cell]');
    if (cell) {
      selectCell(Number(cell.dataset.row), Number(cell.dataset.col));
      render();
      return;
    }

    const clue = event.target.closest?.('[data-cw2-entry]');
    if (clue) {
      selectEntry(Number(clue.dataset.cw2Entry));
      render();
      return;
    }

    const action = event.target.closest?.('[data-cw2-action]')?.dataset?.cw2Action;
    if (action === 'clear') clear();
    if (action === 'check') checkAll();
    if (action === 'fullscreen') fullscreen();
    if (action === 'level1') switchLevel1();
    if (action === 'exit') exit();
  }

  function handleKeydown(event) {
    if (!document.querySelector('.electronics-crossword-level2')) return;
    if (/^[a-zA-Z]$/.test(event.key)) { event.preventDefault(); inputLetter(event.key); return; }
    if (event.key === 'Backspace') { event.preventDefault(); backspace(); return; }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); arrow(1); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); arrow(-1); return; }
    if (event.key === ' ') {
      event.preventDefault();
      const cell = state.selected;
      if (cell) selectCell(cell.row, cell.col);
      render();
    }
  }

  function normalizeLevel1Exit() {
    const button = document.querySelector('[data-action="exit-electronics-crossword"]');
    if (button && button.textContent.trim() !== '← Levels') button.textContent = '← Levels';
  }

  function installEvents() {
    if (installed) return;
    installed = true;
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown, true);
    const observer = new MutationObserver(normalizeLevel1Exit);
    observer.observe(document.body, { childList: true, subtree: true });
    normalizeLevel1Exit();
  }

  function injectStyles() {
    if (document.getElementById('ece-crossword-level2-styles')) return;
    const style = document.createElement('style');
    style.id = 'ece-crossword-level2-styles';
    style.textContent = `
      .electronics-crossword-level2{width:100%;max-width:1440px;margin:0 auto;padding:28px 32px 48px;color:#12213b;font-family:inherit}
      .electronics-crossword-level2 *{box-sizing:border-box}
      .cw2-header{display:flex;gap:16px;align-items:flex-start;margin-bottom:22px}
      .cw2-header h1{margin:0;font-size:clamp(26px,2.5vw,36px);line-height:1.1;letter-spacing:-.035em}
      .cw2-eyebrow{color:#718096;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      .cw2-header p{margin:8px 0 0;color:#64748b;font-size:15px}
      .cw2-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,360px);gap:20px;align-items:start}
      .cw2-card{min-width:0;background:#fff;border:1px solid rgba(148,163,184,.28);border-radius:20px;box-shadow:0 12px 34px rgba(15,23,42,.07)}
      .cw2-board-card{padding:20px}
      .cw2-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
      .cw2-tools{display:flex;align-items:center;gap:8px}
      .cw2-tools button,.cw2-actions button,.cw2-header button{border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#12213b;min-height:38px;padding:8px 13px;font:inherit;font-size:13px;font-weight:750;cursor:pointer}
      .cw2-tools button:hover,.cw2-actions button:hover,.cw2-header button:hover{background:#f7f8fc}
      .cw2-tools .primary,.cw2-actions .primary{background:#5b4be8;color:#fff;border-color:#5b4be8}
      .cw2-board-shell{width:100%;aspect-ratio:1/1;min-height:300px;display:flex;align-items:center;justify-content:center;padding:8px;overflow:hidden;background:#f7f9fd;border:1px solid #edf1f7;border-radius:14px}
      .cw2-board{width:min(100%,620px);aspect-ratio:1/1;display:grid;grid-template-columns:repeat(17,minmax(0,1fr));grid-template-rows:repeat(17,minmax(0,1fr));gap:1px;padding:2px;background:#18243d;border:2px solid #18243d;border-radius:8px;overflow:hidden;user-select:none;touch-action:manipulation}
      .cw2-block,.cw2-cell{min-width:0;min-height:0}
      .cw2-block{background:#18243d}
      .cw2-cell{position:relative;display:flex;align-items:center;justify-content:center;border:0;padding:0;background:#fff;color:#12213b;font-size:clamp(9px,1.6vw,18px);font-weight:850;cursor:pointer}
      .cw2-cell:hover{background:#f0f2ff}
      .cw2-cell.word-selected{background:#eae8ff}
      .cw2-cell.selected{background:#5b4be8;color:#fff;box-shadow:inset 0 0 0 2px #4637d5;z-index:2}
      .cw2-cell.locked{background:#dcfce7;color:#166534;cursor:default}
      .cw2-cell.locked::after{content:'✓';position:absolute;right:2px;bottom:1px;font-size:clamp(6px,1vw,10px);color:#22a05a}
      .cw2-cell.selected.locked{background:#b9edcf;color:#14532d;box-shadow:inset 0 0 0 2px #22a05a}
      .cw2-cell.error{background:#fee2e2;color:#b91c1c;animation:cw2wiggle .42s ease}
      @keyframes cw2wiggle{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
      .cw2-num{position:absolute;top:2px;left:3px;font-size:clamp(5px,.7vw,9px);line-height:1;color:#64748b}
      .cw2-cell.selected .cw2-num{color:#fff}
      .cw2-cell.locked .cw2-num{color:#32805a}
      .cw2-letter{pointer-events:none}
      .cw2-status{min-height:52px;margin-top:14px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
      .cw2-status strong{font-size:14px}.cw2-status span{color:#64748b;font-size:12px;text-align:right}
      .cw2-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
      .cw2-side{display:flex;flex-direction:column;gap:14px;min-width:0}
      .cw2-howto,.cw2-clues{padding:18px}
      .cw2-howto h2,.cw2-clues h2{margin:0 0 10px;font-size:16px}
      .cw2-howto p,.cw2-howto li{color:#64748b;font-size:13px;line-height:1.65}.cw2-howto ul{margin:10px 0 0;padding-left:18px}
      .cw2-clues{max-height:calc(100vh - 180px);overflow:auto;overscroll-behavior:contain}
      .cw2-section + .cw2-section{margin-top:22px;padding-top:20px;border-top:1px solid #edf1f7}
      .cw2-section h3{margin:0 0 9px;color:#18aeea;font-size:16px;letter-spacing:.1em;text-transform:uppercase}
      .cw2-clue{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);gap:7px;align-items:start;padding:9px 8px;border:0;border-radius:10px;background:transparent;color:#24324a;font:inherit;text-align:left;cursor:pointer}
      .cw2-clue:hover{background:#f6f7fb}.cw2-clue.active{background:#eeecff;box-shadow:inset 3px 0 #18aeea}.cw2-clue.completed{background:#effaf3}.cw2-clue.completed .cw2-clue-num{color:#16a05a}.cw2-clue-num{color:#18aeea;font-weight:850}.cw2-clue-text{color:#64748b;line-height:1.45}
      @media(max-width:900px){.cw2-layout{grid-template-columns:1fr}.cw2-clues{max-height:420px}.cw2-board-shell{min-height:0}.electronics-crossword-level2{padding:20px 16px 40px}}
      @media(max-width:520px){.cw2-header{flex-direction:column}.cw2-board-card{padding:12px}.cw2-tools span{display:none}.cw2-board-shell{padding:4px}}
      .electronics-crossword-level2:fullscreen{background:#f8fafc;overflow:auto;padding:28px}
      .cw-level-map{width:100%;max-width:980px;margin:0 auto;padding:34px 24px 56px;color:#12213b;font-family:inherit}
      .cw-level-map-header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:30px}
      .cw-level-map-header h1{margin:6px 0 8px;font-size:clamp(28px,4vw,46px);line-height:1.05;letter-spacing:-.035em}
      .cw-level-map-exit{border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#12213b;min-height:38px;padding:8px 13px;font:inherit;font-size:13px;font-weight:750;cursor:pointer}
      .cw-level-map-header p{margin:0;color:#64748b;font-size:15px}
      .cw-level-map-eyebrow{color:#18aeea;font-size:12px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
      .cw-level-map-progress{min-width:170px;padding:13px 15px;border:1px solid #dbe3ef;border-radius:12px;background:#fff;color:#64748b;font-size:12px;text-align:right}
      .cw-level-map-progress strong{display:block;color:#12213b;font-size:18px;margin-bottom:3px}
      .cw-level-path{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 22px;padding:22px 10px}
      .cw-level-path::before{content:'';position:absolute;top:0;bottom:0;left:50%;width:2px;background:linear-gradient(#dbe3ef 0 75%,transparent 75%);z-index:0}
      .cw-level-node{position:relative;z-index:1;display:flex;justify-content:center}
      .cw-level-node:nth-child(3n+2){transform:translateY(26px)}
      .cw-level-button{width:142px;min-height:142px;padding:18px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px solid #cbd7e6;border-radius:50%;background:#fff;color:#12213b;box-shadow:0 10px 22px rgba(15,23,42,.07);font:inherit;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
      .cw-level-button:hover{transform:translateY(-4px);border-color:#18aeea;box-shadow:0 14px 28px rgba(15,23,42,.12)}
      .cw-level-button strong{font-size:30px;line-height:1}
      .cw-level-button span{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
      .cw-level-button.current{border:4px solid #18aeea;padding:15px;background:#f2fbff}
      .cw-level-button.locked{background:#eef2f7;color:#8b98aa;border-color:#d6dee9;cursor:not-allowed;box-shadow:none}
      .cw-level-button.locked:hover{transform:none;border-color:#d6dee9}
      .cw-level-lock{font-size:18px;color:#8b98aa}
      .cw-level-note{margin:34px auto 0;max-width:560px;padding:14px 16px;border-left:3px solid #18aeea;background:#fff;color:#64748b;font-size:13px;line-height:1.55}
      .electronics-crossword-level3{width:100%;max-width:1180px;margin:0 auto;padding:28px 32px 48px;color:#12213b;font-family:inherit}.electronics-crossword-level3 *{box-sizing:border-box}.cw3-header{display:flex;gap:16px;align-items:flex-start;margin-bottom:22px}.cw3-header h1{margin:6px 0 8px;font-size:clamp(26px,2.5vw,36px);line-height:1.1}.cw3-header span{color:#18aeea;font-size:12px;font-weight:850;letter-spacing:.12em}.cw3-header p{margin:0;color:#64748b;font-size:15px}.cw3-header button,.cw3-actions button{border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#12213b;min-height:38px;padding:8px 13px;font:inherit;font-size:13px;font-weight:750;cursor:pointer}.cw3-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:20px;align-items:start}.cw3-card{min-width:0;background:#fff;border:1px solid rgba(148,163,184,.28);border-radius:20px;box-shadow:0 12px 34px rgba(15,23,42,.07)}.cw3-board-card{padding:20px}.cw3-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.cw3-board-shell{width:100%;max-width:660px;margin:auto;aspect-ratio:1/1;padding:8px;display:flex;align-items:center;justify-content:center;background:#f7f9fd;border:1px solid #edf1f7;border-radius:14px}.cw3-board{width:100%;aspect-ratio:1/1;display:grid;grid-template-columns:repeat(17,minmax(0,1fr));grid-template-rows:repeat(17,minmax(0,1fr));gap:1px;padding:2px;background:#18243d;border:2px solid #18243d;border-radius:8px;overflow:hidden}.cw3-block,.cw3-cell{min-width:0;min-height:0}.cw3-block{background:#18243d}.cw3-cell{position:relative;display:flex;align-items:center;justify-content:center;border:0;padding:0;background:#fff;color:#12213b;font-size:clamp(10px,1.7vw,19px);font-weight:850;cursor:pointer}.cw3-cell.word-selected{background:#eae8ff}.cw3-cell.selected{background:#5b4be8;color:#fff}.cw3-cell.locked{background:#dcfce7;color:#166534;cursor:default}.cw3-cell.selected.locked{background:#b9edcf;color:#14532d}.cw3-num{position:absolute;top:2px;left:3px;font-size:9px;color:#64748b}.cw3-cell.selected .cw3-num{color:#fff}.cw3-cell.locked .cw3-num{color:#32805a}.cw3-status{min-height:52px;margin-top:14px;padding:11px 14px;display:flex;justify-content:space-between;gap:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.cw3-message{color:#64748b;font-size:12px;text-align:right}.cw3-actions{display:flex;gap:9px;margin-top:12px}.cw3-actions .primary{background:#5b4be8;color:#fff;border-color:#5b4be8}.cw3-clues{padding:18px}.cw3-clues h2{margin:0 0 10px;font-size:16px}.cw3-clue{width:100%;display:grid;grid-template-columns:32px minmax(0,1fr);gap:7px;padding:10px 8px;border:0;border-radius:10px;background:transparent;color:#64748b;font:inherit;text-align:left;cursor:pointer}.cw3-clue.active{background:#eeecff;box-shadow:inset 3px 0 #18aeea}.cw3-clue.completed{background:#effaf3}.cw3-clue strong{color:#18aeea}.cw3-clue span{line-height:1.45}@media(max-width:800px){.electronics-crossword-level3{padding:20px 16px 40px}.cw3-layout{grid-template-columns:1fr}.cw3-board-shell{max-width:none}}
      @media(max-width:650px){.cw-level-map{padding:24px 16px 44px}.cw-level-map-header{align-items:flex-start;flex-direction:column}.cw-level-map-progress{text-align:left}.cw-level-path{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 8px}.cw-level-path::before{left:50%}.cw-level-node:nth-child(3n+2){transform:none}.cw-level-button{width:126px;min-height:126px}.cw-level-button strong{font-size:27px}}
    `;
    document.head.appendChild(style);
  }

  function renderBoard() {
    const host = document.getElementById('electronicsCrosswordLevel2Board');
    if (!host || !state) return;
    host.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.board[r][c];
        const button = document.createElement('button');
        if (!cell) {
          button.className = 'cw2-block';
          button.tabIndex = -1;
          host.appendChild(button);
          continue;
        }
        const key = `${r}:${c}`;
        const selected = state.selected?.row === r && state.selected?.col === c;
        const active = cell.entryIndexes.includes(state.activeEntry);
        const locked = state.locked.has(key);
        const error = state.errorEntry !== null &&
          entryCells(state.errorEntry).some(x => x.row === r && x.col === c);

        button.type = 'button';
        button.className = `cw2-cell${active ? ' word-selected' : ''}${selected ? ' selected' : ''}${locked ? ' locked' : ''}${error ? ' error' : ''}`;
        button.dataset.cw2Cell = '1';
        button.dataset.row = r;
        button.dataset.col = c;

        const n = state.starts.get(`${r}:${c}`);
        button.innerHTML = `${n ? `<span class="cw2-num">${n}</span>` : ''}<span class="cw2-letter">${esc(state.values[r][c])}</span>`;
        host.appendChild(button);
      }
    }
  }

  function renderClues() {
    const across = document.getElementById('electronicsCrosswordLevel2Across');
    const down = document.getElementById('electronicsCrosswordLevel2Down');
    if (!across || !down || !state) return;

    const make = (entry, index) =>
      `<button type="button" class="cw2-clue${state.activeEntry === index ? ' active' : ''}${state.completed.has(index) ? ' completed' : ''}" data-cw2-entry="${index}">
        <span class="cw2-clue-num">${entry.number}.</span>
        <span class="cw2-clue-text">${esc(entry.clue)}</span>
      </button>`;

    across.innerHTML = ENTRIES.filter(e => e.direction === 'across')
      .map(e => make(e, ENTRIES.indexOf(e))).join('');
    down.innerHTML = ENTRIES.filter(e => e.direction === 'down')
      .map(e => make(e, ENTRIES.indexOf(e))).join('');
  }

  function render() {
    injectStyles();
    installEvents();
    if (!state) reset();

    const root = document.getElementById('electronicsCrosswordLevel2Root');
    if (!root) return;

    root.querySelector('.cw2-count').textContent = `${state.completed.size} / ${ENTRIES.length} words locked`;
    root.querySelector('.cw2-message').textContent = state.message;
    renderBoard();
    renderClues();

    if (state.errorEntry !== null) {
      setTimeout(() => {
        if (state?.errorEntry !== null) {
          state.errorEntry = null;
          render();
        }
      }, 480);
    }
  }

  function startLevels() {
    window.__eceCrosswordActiveLevel = 0;
    if (typeof window.go === 'function') window.go('explore-crossword');
  }

  function levelsView() {
    injectStyles();
    installEvents();
    const levels = Array.from({ length: 12 }, (_, index) => index + 1);
    return `
      <section class="cw-level-map" aria-label="Electronics Crossword levels">
        <header class="cw-level-map-header">
          <div>
            <button type="button" class="cw-level-map-exit" data-cw-map-action="exit">← Explore</button>
            <span class="cw-level-map-eyebrow">ELECTRONICS · CROSSWORD</span>
            <h1>Choose a level</h1>
            <p>Build your technical vocabulary one puzzle at a time.</p>
          </div>
          <div class="cw-level-map-progress"><strong>12 of 12 available</strong>Choose any level to begin.</div>
        </header>
        <div class="cw-level-path">
          ${levels.map(level => {
            const locked = false;
            const current = level === 1;
            return `<div class="cw-level-node">
              <button type="button" class="cw-level-button${current ? ' current' : ''}${locked ? ' locked' : ''}" data-cw-level="${level}"${locked ? ' disabled aria-disabled="true"' : ''}>
                ${locked ? '<span class="cw-level-lock" aria-hidden="true">&#128274;</span>' : '<span>Level</span>'}
                <strong>${level}</strong>
                <span>${locked ? 'Locked' : level === 1 ? 'Foundations' : level === 2 ? 'Technicalities' : (window.EcECrosswordLevelTitles?.[level] || 'Available')}</span>
              </button>
            </div>`;
          }).join('')}
        </div>
        <p class="cw-level-note">Select any level to begin. Each puzzle is generated from its word definitions and clues.</p>
      </section>`;
  }

  function view() {
    injectStyles();
    installEvents();
    if (!state) reset();
    return `
      <section class="electronics-crossword-level2" id="electronicsCrosswordLevel2Root">
        <div class="cw2-header">
          <button type="button" data-cw2-action="exit">← Levels</button>
          <div>
            <span class="cw2-eyebrow">ELECTRONICS · GAME · LEVEL 2</span>
            <h1>Electronics Technicalities</h1>
            <p>Advanced electronics terminology — a harder crossword set.</p>
          </div>
        </div>
        <div class="cw2-layout">
          <section class="cw2-card cw2-board-card">
            <div class="cw2-heading">
              <strong>Crossword · Level 2</strong>
              <div class="cw2-tools">
                <span>13 clues</span>
                <button type="button" data-cw2-action="level1">Level 1</button>
                <button type="button" data-cw2-action="fullscreen">⛶ Fullscreen</button>
              </div>
            </div>
            <div class="cw2-board-shell">
              <div class="cw2-board" id="electronicsCrosswordLevel2Board"></div>
            </div>
            <div class="cw2-status">
              <strong class="cw2-count">0 / 13 words locked</strong>
              <span class="cw2-message">${esc(state.message)}</span>
            </div>
            <div class="cw2-actions">
              <button type="button" data-cw2-action="clear">Clear unlocked</button>
              <button type="button" class="primary" data-cw2-action="check">Check Answers</button>
            </div>
          </section>
          <aside class="cw2-side">
            <section class="cw2-card cw2-howto">
              <h2>🧩 How to play</h2>
              <p>Complete the entire word before it is checked. Correct words turn green and lock permanently. Locked letters cannot be edited, even when the same cell is part of another direction.</p>
              <ul>
                <li>Click any clue number to choose the word you want to answer.</li>
                <li>Type letters to move automatically within the selected word.</li>
                <li>Finish a word to validate it.</li>
                <li>Correct words lock, but the game never forces you to answer a specific clue next.</li>
                <li>Wrong completed words wiggle and stay editable.</li>
                <li>Click an intersection or press Space to switch direction.</li>
                <li>Use Fullscreen when you need a larger board.</li>
              </ul>
            </section>
            <section class="cw2-card cw2-clues">
              <div class="cw2-section">
                <h3>Across</h3>
                <div id="electronicsCrosswordLevel2Across"></div>
              </div>
              <div class="cw2-section">
                <h3>Down</h3>
                <div id="electronicsCrosswordLevel2Down"></div>
              </div>
            </section>
          </aside>
        </div>
      </section>`;
  }

  function start() {
    window.__eceCrosswordActiveLevel = 2;
    injectStyles();
    installEvents();
    reset();
    if (typeof window.go === 'function') window.go('explore-crossword');
    setTimeout(() => {
      const content = document.getElementById('content');
      if (content) content.innerHTML = view();
      render();
    }, 0);
  }

  // Expose to the live runtime object
  const runtime = window.ExploreGames || (window.ExploreGames = {});
  runtime.electronicsCrosswordLevel2View = view;
  runtime.startElectronicsCrosswordLevel2 = start;
  runtime.submitElectronicsCrosswordLevel2 = checkAll;
  runtime.clearElectronicsCrosswordLevel2 = clear;
  runtime.exitElectronicsCrosswordLevel2 = exit;

  window.electronicsCrosswordLevel2View = view;
  window.electronicsCrosswordLevelsView = levelsView;
  window.startElectronicsCrosswordLevels = startLevels;
  window.startElectronicsCrosswordLevel2 = start;
  window.submitElectronicsCrosswordLevel2 = checkAll;
  window.clearElectronicsCrosswordLevel2 = clear;
  window.exitElectronicsCrosswordLevel2 = exit;
})();


/* ============================================================
   3. Level 3 local implementation
   ============================================================ */
(function () {
  'use strict';

  const SIZE = 17;
  const LEVELS = {
    1: { title: 'Circuit Foundations', words: [['RESISTOR', 'A component that limits the flow of electric current.'], ['VOLTAGE', 'The electrical potential difference between two points.'], ['CURRENT', 'The rate at which electric charge flows.'], ['DIODE', 'A semiconductor device that mainly allows one-way current.'], ['POWER', 'The rate of electrical energy transfer.'], ['GROUND', 'A common reference point in an electrical circuit.'], ['SWITCH', 'A device that opens or closes an electrical path.']] },
    2: { title: 'Core Electronics', words: [['AMPLIFIER', 'A circuit that increases the amplitude of a signal.'], ['FREQUENCY', 'The number of cycles of a periodic signal per second.'], ['IMPEDANCE', 'The opposition a circuit presents to alternating current.'], ['INDUCTOR', 'A component that stores energy in a magnetic field.'], ['PHASE', 'The relative position of a periodic waveform in its cycle.'], ['RECTIFIER', 'A circuit that converts alternating current to one direction.'], ['MOSFET', 'A voltage-controlled transistor used for switching and amplification.']] },
    3: { title: 'Electronic Systems', words: [
      ['TRANSISTOR', 'A semiconductor device used to amplify or switch electronic signals.'], ['CAPACITOR', 'A component that stores electrical energy in an electric field.'], ['CURRENT', 'The rate at which electric charge flows through a circuit.'], ['DIGITAL', 'A signal or system represented using discrete values.'], ['SENSOR', 'A device that detects a physical condition and produces a corresponding signal.'], ['VOLTAGE', 'The electrical potential difference between two points.'], ['TUNER', 'A circuit that selects a desired frequency from a range of signals.']
    ] },
    4: { title: 'Power and Signals', words: [['RECTIFIER', 'A circuit that converts alternating current into one-direction current.'], ['REGULATOR', 'A circuit that maintains a stable output voltage.'], ['DIODE', 'A semiconductor device that allows current mainly in one direction.'], ['RIPPLE', 'Residual periodic variation in a rectified power supply output.'], ['FILTER', 'A circuit that passes selected frequencies and attenuates others.'], ['GROUND', 'A common reference point for electrical potential.'], ['SURGE', 'A sudden temporary increase in voltage or current.']] },
    5: { title: 'Digital Logic', words: [['BOOLEAN', 'A logic system based on true and false values.'], ['FLIPFLOP', 'A bistable circuit that stores one bit of information.'], ['REGISTER', 'A group of digital storage elements used together.'], ['COUNTER', 'A sequential circuit that advances through a series of states.'], ['NAND', 'A universal logic gate that negates the AND operation.'], ['CLOCK', 'A periodic timing signal used to synchronize digital circuits.'], ['XOR', 'A logic operation true when its inputs are different.']] },
    6: { title: 'Semiconductor Devices', words: [['MOSFET', 'A voltage-controlled field-effect transistor.'], ['THYRISTOR', 'A latching semiconductor switch used in power control.'], ['JUNCTION', 'The boundary between regions of different semiconductor type.'], ['DOPING', 'Adding impurities to change a semiconductor conductivity.'], ['EMITTER', 'The transistor terminal that injects charge carriers.'], ['DRAIN', 'The field-effect transistor terminal where carriers leave the channel.'], ['CHANNEL', 'The controlled conducting path in a field-effect transistor.']] },
    7: { title: 'Communication Systems', words: [['MODULATION', 'Changing a carrier signal to encode information.'], ['ANTENNA', 'A structure that transmits or receives electromagnetic waves.'], ['CARRIER', 'A waveform used to transport an information signal.'], ['RECEIVER', 'A device that recovers information from a received signal.'], ['BANDPASS', 'A filter that passes a range of frequencies.'], ['NOISE', 'Unwanted random electrical interference in a signal.'], ['DUPLEX', 'Communication that allows transmission in two directions.']] },
    8: { title: 'Control Engineering', words: [['FEEDBACK', 'Returning part of a system output to its input.'], ['STABILITY', 'The ability of a system to return to equilibrium.'], ['PID', 'A controller using proportional, integral, and derivative actions.'], ['PLANT', 'The process or system being controlled.'], ['ERROR', 'The difference between a desired and measured value.'], ['RESPONSE', 'The output behavior of a system after an input change.'], ['SETPOINT', 'The desired target value for a controlled variable.']] },
    9: { title: 'Instrumentation', words: [['CALIBRATION', 'Comparing an instrument with a known reference.'], ['ACCURACY', 'How close a measurement is to the true value.'], ['RESOLUTION', 'The smallest change an instrument can distinguish.'], ['TRANSDUCER', 'A device that converts one form of energy into another.'], ['GAUGE', 'An instrument used to measure a physical quantity.'], ['SCALE', 'A graduated range used to read a measurement.'], ['PRECISION', 'The repeatability of a measurement.']] },
    10: { title: 'Microelectronics', words: [['MICROPROCESSOR', 'An integrated circuit that executes programmed instructions.'], ['ARCHITECTURE', 'The organization and design of a computing system.'], ['CACHE', 'Fast memory holding frequently used data.'], ['PIPELINE', 'Overlapping stages of instruction processing.'], ['BUS', 'A shared pathway for signals or data.'], ['FIRMWARE', 'Software stored in nonvolatile device memory.'], ['MEMORY', 'Electronic storage for data and instructions.']] },
    11: { title: 'Advanced Circuits', words: [['IMPEDANCE', 'Opposition to alternating current combining resistance and reactance.'], ['REACTANCE', 'Opposition to AC caused by capacitance or inductance.'], ['PHASOR', 'A complex representation of a sinusoidal quantity.'], ['THEVENIN', 'A theorem replacing a linear network with a source and resistance.'], ['NORTON', 'A theorem replacing a network with a current source and resistance.'], ['SUPERPOSITION', 'A method that sums responses from independent sources.'], ['ADMITTANCE', 'The reciprocal of impedance.']] },
    12: { title: 'Engineering Mastery', words: [['ELECTROMAGNETIC', 'Relating to linked electric and magnetic fields.'], ['FOURIER', 'A transform that represents signals as frequency components.'], ['LAPLACE', 'A transform used to analyze linear dynamic systems.'], ['EIGENVALUE', 'A scalar associated with a linear transformation and eigenvector.'], ['CONVOLUTION', 'An operation combining two signals to form a third.'], ['QUANTIZATION', 'Mapping a continuous range of values to discrete levels.'], ['SAMPLING', 'Measuring a continuous signal at discrete time intervals.']] }
  };
  window.EcECrosswordLevelTitles = Object.fromEntries(Object.entries(LEVELS).map(([level, data]) => [level, data.title]));
  let WORD_DEFINITIONS = LEVELS[3].words.map(([answer, clue]) => ({ answer, clue }));
  let ENTRIES = [];
  let state = null;
  let installed = false;

  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const cellsFor = entry => Array.from({ length: entry.answer.length }, (_, i) => ({
    row: entry.row + (entry.direction === 'down' ? i : 0),
    col: entry.col + (entry.direction === 'across' ? i : 0)
  }));

  function createCrossword(definitions, size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    const placed = [];
    const canPlace = (word, row, col, direction) => {
      const cells = Array.from({ length: word.length }, (_, i) => ({
        row: row + (direction === 'down' ? i : 0),
        col: col + (direction === 'across' ? i : 0)
      }));
      if (cells.some(cell => cell.row < 0 || cell.row >= size || cell.col < 0 || cell.col >= size)) return false;
      return cells.every((cell, i) => {
        const current = grid[cell.row][cell.col];
        if (current && current.letter !== word[i]) return false;
        if (current) return true;
        const before = direction === 'across' ? [cell.row, cell.col - 1] : [cell.row - 1, cell.col];
        const after = direction === 'across' ? [cell.row, cell.col + 1] : [cell.row + 1, cell.col];
        const perpendicular = direction === 'across'
          ? [[cell.row - 1, cell.col], [cell.row + 1, cell.col]]
          : [[cell.row, cell.col - 1], [cell.row, cell.col + 1]];
        const occupied = ([r, c]) => r >= 0 && r < size && c >= 0 && c < size && grid[r][c];
        return !(i === 0 && occupied(before)) && !(i === word.length - 1 && occupied(after)) && !perpendicular.some(occupied);
      });
    };
    const put = (definition, row, col, direction) => {
      const entry = { ...definition, number: placed.length + 1, row, col, direction };
      cellsFor(entry).forEach((cell, index) => { grid[cell.row][cell.col] = { letter: entry.answer[index], entryIndex: placed.length }; });
      placed.push(entry);
    };
    const first = definitions[0];
    put(first, Math.floor(size / 2), Math.floor((size - first.answer.length) / 2), 'across');
    definitions.slice(1).forEach(definition => {
      const candidates = [];
      for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) for (const direction of ['across', 'down']) {
        if (!canPlace(definition.answer, row, col, direction)) continue;
        const cells = Array.from({ length: definition.answer.length }, (_, i) => ({ row: row + (direction === 'down' ? i : 0), col: col + (direction === 'across' ? i : 0) }));
        const crossings = cells.filter((cell, i) => grid[cell.row][cell.col]?.letter === definition.answer[i]).length;
        candidates.push({ row, col, direction, crossings, distance: Math.abs(row - size / 2) + Math.abs(col - size / 2) });
      }
      candidates.sort((a, b) => b.crossings - a.crossings || a.distance - b.distance);
      if (candidates[0]) put(definition, candidates[0].row, candidates[0].col, candidates[0].direction);
    });
    return placed;
  }

  window.EcECrosswordMaker = createCrossword;

  function reset(level = 3) {
    const levelData = LEVELS[level] || LEVELS[3];
    WORD_DEFINITIONS = levelData.words.map(([answer, clue]) => ({ answer, clue }));
    ENTRIES = createCrossword(WORD_DEFINITIONS, SIZE);
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const starts = new Map();
    ENTRIES.forEach((entry, index) => {
      starts.set(`${entry.row}:${entry.col}`, entry.number);
      cellsFor(entry).forEach((cell, offset) => {
        board[cell.row][cell.col] = { row: cell.row, col: cell.col, answer: entry.answer[offset], entryIndexes: [...(board[cell.row][cell.col]?.entryIndexes || []), index] };
      });
    });
    state = { level, title: levelData.title, board, starts, values: Array.from({ length: SIZE }, () => Array(SIZE).fill('')), locked: new Set(), completed: new Set(), selected: null, activeEntry: 0, message: 'Choose a clue and solve the puzzle.' };
  }

  function selectEntry(index) {
    if (!state || !ENTRIES[index]) return;
    state.activeEntry = index;
    state.selected = cellsFor(ENTRIES[index]).find(cell => !state.locked.has(`${cell.row}:${cell.col}`) && !state.values[cell.row][cell.col])
      || cellsFor(ENTRIES[index]).find(cell => !state.locked.has(`${cell.row}:${cell.col}`))
      || null;
    state.message = `${ENTRIES[index].number} ${ENTRIES[index].direction} selected.`;
  }

  function entryIsComplete(index) {
    return cellsFor(ENTRIES[index]).every(cell => state.values[cell.row][cell.col]);
  }

  function validate(index) {
    if (state.completed.has(index)) return true;
    const cells = cellsFor(ENTRIES[index]);
    if (!cells.every(cell => state.values[cell.row][cell.col])) return false;
    if (cells.map(cell => state.values[cell.row][cell.col]).join('') !== ENTRIES[index].answer) {
      state.message = `Check ${ENTRIES[index].number} and try again.`;
      return false;
    }
    state.completed.add(index);
    cells.forEach(cell => state.locked.add(`${cell.row}:${cell.col}`));
    state.selected = null;
    state.message = `${ENTRIES[index].number} is correct. Choose any clue to continue.`;
    return true;
  }

  function input(letter) {
    if (!state?.selected) return;
    let cell = state.selected;
    const activeCells = cellsFor(ENTRIES[state.activeEntry]);
    const startOffset = activeCells.findIndex(item => item.row === cell.row && item.col === cell.col);
    if (state.locked.has(`${cell.row}:${cell.col}`)) {
      cell = activeCells.slice(Math.max(0, startOffset + 1)).find(item => !state.locked.has(`${item.row}:${item.col}`));
      if (!cell) return;
      state.selected = cell;
    }
    state.values[cell.row][cell.col] = letter.toUpperCase();
    const cells = activeCells;
    const offset = cells.findIndex(item => item.row === cell.row && item.col === cell.col);
    state.selected = offset < cells.length - 1 ? cells[offset + 1] : cell;
    if (entryIsComplete(state.activeEntry)) validate(state.activeEntry);
    render();
  }

  function check() { ENTRIES.forEach((_, index) => validate(index)); render(); }
  function clear() { if (!state) reset(); state.values = state.values.map(row => row.map(value => value)); ENTRIES.forEach((entry, index) => { if (!state.completed.has(index)) cellsFor(entry).forEach(cell => { state.values[cell.row][cell.col] = ''; }); }); state.message = 'Unfinished answers cleared.'; render(); }
  function exit() { state = null; window.__eceCrosswordActiveLevel = 0; if (typeof window.go === 'function') window.go('explore-crossword'); }

  function render() {
    const root = document.getElementById('electronicsCrosswordLevel3Root');
    if (!root || !state) return;
    root.querySelector('.cw3-count').textContent = `${state.completed.size} / ${ENTRIES.length} words locked`;
    root.querySelector('.cw3-message').textContent = state.message;
    const board = root.querySelector('#electronicsCrosswordLevel3Board');
    board.innerHTML = '';
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      const cell = state.board[row][col];
      const button = document.createElement('button');
      const locked = cell && state.locked.has(`${row}:${col}`);
      button.className = cell ? `cw3-cell${cell.entryIndexes?.includes(state.activeEntry) ? ' word-selected' : ''}${state.selected?.row === row && state.selected?.col === col ? ' selected' : ''}${locked ? ' locked' : ''}` : 'cw3-block';
      button.type = 'button';
      if (cell) { button.dataset.cw3Cell = '1'; button.dataset.row = row; button.dataset.col = col; const number = state.starts.get(`${row}:${col}`); button.innerHTML = `${number ? `<span class="cw3-num">${number}</span>` : ''}<span>${esc(state.values[row][col])}</span>`; }
      board.appendChild(button);
    }
    root.querySelector('#electronicsCrosswordLevel3Clues').innerHTML = ENTRIES.map((entry, index) => `<button type="button" class="cw3-clue${state.activeEntry === index ? ' active' : ''}${state.completed.has(index) ? ' completed' : ''}" data-cw3-entry="${index}"><strong>${entry.number}.</strong><span>${esc(entry.clue)}</span></button>`).join('');
  }

  function handleClick(event) {
    const clue = event.target.closest?.('[data-cw3-entry]');
    if (clue) { selectEntry(Number(clue.dataset.cw3Entry)); render(); return; }
    const cell = event.target.closest?.('[data-cw3-cell]');
    if (cell) { selectEntry(Number(state.board[cell.dataset.row][cell.dataset.col].entryIndexes[0])); state.selected = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }; render(); return; }
    const action = event.target.closest?.('[data-cw3-action]')?.dataset.cw3Action;
    if (action === 'check') check();
    if (action === 'clear') clear();
    if (action === 'levels') exit();
  }

  function handleKeydown(event) {
    if (!document.querySelector('.electronics-crossword-level3')) return;
    if (/^[a-zA-Z]$/.test(event.key)) { event.preventDefault(); input(event.key); }
  }

  function installEvents() { if (installed) return; installed = true; document.addEventListener('click', handleClick, true); document.addEventListener('keydown', handleKeydown, true); }
  function injectGridStyle() {
    if (document.getElementById('ece-cw3-grid-style')) return;
    const style = document.createElement('style');
    style.id = 'ece-cw3-grid-style';
    style.textContent = '.cw3-board{grid-template-columns:repeat(17,minmax(0,1fr));grid-template-rows:repeat(17,minmax(0,1fr))}';
    document.head.appendChild(style);
  }
  function normalizeLevel1Exit() {
    const button = document.querySelector('[data-action="exit-electronics-crossword"]');
    if (button && button.textContent.trim() !== '← Levels') button.textContent = '← Levels';
  }

  function view() {
    installEvents(); injectGridStyle(); if (!state) reset();
    return `<section class="electronics-crossword-level3" id="electronicsCrosswordLevel3Root"><header class="cw3-header"><button type="button" data-cw3-action="levels">← Levels</button><div><span> ELECTRONICS · GAME · LEVEL ${state.level}</span><h1>${esc(state.title)}</h1><p>Advanced signals, devices, and system concepts.</p></div></header><div class="cw3-layout"><section class="cw3-card cw3-board-card"><div class="cw3-heading"><strong>Crossword · Level ${state.level}</strong><span>${ENTRIES.length} clues</span></div><div class="cw3-board-shell"><div class="cw3-board" id="electronicsCrosswordLevel3Board"></div></div><div class="cw3-status"><strong class="cw3-count">0 / ${ENTRIES.length} words locked</strong><span class="cw3-message"></span></div><div class="cw3-actions"><button type="button" data-cw3-action="clear">Clear unlocked</button><button type="button" class="primary" data-cw3-action="check">Check Answers</button></div></section><aside class="cw3-card cw3-clues"><h2>Clues</h2><div id="electronicsCrosswordLevel3Clues"></div></aside></div></section>`;
  }
  function start(level = 3) { window.__eceCrosswordActiveLevel = level; reset(level); if (typeof window.go === 'function') window.go('explore-crossword'); setTimeout(() => { const content = document.getElementById('content'); if (content) content.innerHTML = view(); render(); }, 0); }
  window.electronicsCrosswordLevel3View = view;
  window.startElectronicsCrosswordLevel3 = start;
  window.startElectronicsCrosswordLevel1 = () => start(1);
  window.startElectronicsCrosswordLevel2 = () => start(2);
})();


/* ============================================================
   4. Level 2 completion / crossing-letter validation fix
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
        const letter = (cell.querySelector('.cw2-letter')?.textContent || '').trim();
        const locked = cell.classList.contains('locked') ? 1 : 0;
        return `${cell.dataset.row}:${cell.dataset.col}:${letter}:${locked}`;
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

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  console.info('EcE Hub Level 2 completion/crossing validation fix installed.');
})();


/* ============================================================
   4. Input + full-grid responsive layout fix (Level 1 + Level 2)
   ============================================================ */
(function () {
  'use strict';

  const CELL_SELECTOR = '.electronics-crossword-cell';
  let redirecting = false;
  let observerTimer = 0;

  function installCrosswordLayoutFix() {
    if (document.getElementById('ece-crossword-layout-fix')) return;

    const style = document.createElement('style');
    style.id = 'ece-crossword-layout-fix';
    style.textContent = `
      /* Level 1 */
      .electronics-crossword-board-wrapper {
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: visible !important;
      }
      .electronics-crossword-board {
        width: fit-content !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        align-self: flex-start;
        contain: layout paint;
        scroll-behavior: auto !important;
      }
      @media (max-width: 900px) {
        .electronics-crossword-board {
          --cw-cell-size: clamp(24px, min(6vw, 5vh), 40px) !important;
          --cw-gap: 1px !important;
        }
      }
      @media (max-width: 600px) {
        .electronics-crossword-board {
          --cw-cell-size: clamp(22px, 6.5vw, 32px) !important;
        }
      }
      .electronics-crossword-page,
      .electronics-crossword-game,
      .electronics-crossword-board-wrapper {
        overflow: visible !important;
      }

      /* Level 2 */
      .electronics-crossword-level2 .cw2-board-shell {
        overflow: visible !important;
        aspect-ratio: auto !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        align-items: flex-start !important;
      }
      .electronics-crossword-level2 .cw2-board {
        width: min(100%, 620px) !important;
        height: auto !important;
        aspect-ratio: 1 / 1 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      @media (max-width: 900px) {
        .electronics-crossword-level2 .cw2-board {
          width: 100% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getBoard() {
    return document.getElementById('electronicsCrosswordBoard');
  }

  function resetBoardScroll() {
    const board = getBoard();
    if (!board) return;
    if (board.scrollTop !== 0) board.scrollTop = 0;
    if (board.scrollLeft !== 0) board.scrollLeft = 0;
  }

  function getSelectedCell() {
    return document.querySelector(`${CELL_SELECTOR}.selected`);
  }

  function getDirection() {
    const clue = document.querySelector('.electronics-crossword-clue.active[data-direction]');
    return clue?.dataset.direction === 'down' ? 'down' : 'across';
  }

  function cellAt(row, col) {
    return document.querySelector(`${CELL_SELECTOR}[data-row="${row}"][data-col="${col}"]`);
  }

  function findNextEditable(startCell, step = 1) {
    if (!startCell) return null;
    const row = Number(startCell.dataset.row);
    const col = Number(startCell.dataset.col);
    const direction = getDirection();
    let r = row;
    let c = col;

    for (let i = 0; i < 30; i++) {
      if (direction === 'down') r += step;
      else c += step;
      const next = cellAt(r, c);
      if (!next) return null;
      if (next.classList.contains('locked')) continue;
      if (!next.classList.contains('word-selected')) return null;
      return next;
    }
    return null;
  }

  function redirectLockedSelection() {
    const selected = getSelectedCell();
    if (!selected || !selected.classList.contains('locked')) return false;
    const next = findNextEditable(selected, 1);
    if (!next) return false;

    redirecting = true;
    try {
      next.click();
    } finally {
      setTimeout(() => { redirecting = false; }, 0);
    }
    return true;
  }

  function handleKeydown(event) {
    if (redirecting) return;
    if (!getBoard()) return;
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;

    const isTyping = /^[a-zA-Z]$/.test(event.key);
    const isEditing = isTyping || event.key === 'Backspace' || event.key === 'Delete';
    if (!isEditing) return;

    if (getSelectedCell()?.classList.contains('locked')) {
      redirectLockedSelection();
    }
  }

  function keepSelectionEditable() {
    if (!getBoard()) return;
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(() => {
      resetBoardScroll();
      redirectLockedSelection();
    }, 0);
  }

  function install() {
    if (document.documentElement.dataset.eceCrosswordInputFix === '1') return;
    document.documentElement.dataset.eceCrosswordInputFix = '1';

    installCrosswordLayoutFix();
    resetBoardScroll();

    document.addEventListener('keydown', handleKeydown, true);

    const observer = new MutationObserver(keepSelectionEditable);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', () => {
      window.setTimeout(keepSelectionEditable, 0);
    }, true);

    window.addEventListener('resize', resetBoardScroll, { passive: true });

    console.log('EcE Hub crossword input + full-grid layout fix (L1+L2) installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();