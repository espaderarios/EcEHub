/* ============================================================
   EcE Hub — Electronics Crossword
   ============================================================ */

(function () {
  'use strict';

  const GRID_ROWS = 12;
  const GRID_COLS = 15;

  const CROSSWORD_ENTRIES = [
    { answer: 'CIRCUIT', clue: 'A complete path through which electric current can flow.', row: 0, col: 2, direction: 'across' },
    { answer: 'CAPACITOR', clue: 'A component that stores electrical charge.', row: 0, col: 2, direction: 'down' },
    { answer: 'VOLT', clue: 'The SI unit of electric potential difference.', row: 1, col: 13, direction: 'down' },
    { answer: 'AMP', clue: 'Common short name for the SI unit of electric current.', row: 2, col: 0, direction: 'across' },
    { answer: 'POWER', clue: 'The rate at which electrical energy is transferred or used.', row: 2, col: 11, direction: 'down' },
    { answer: 'RELAY', clue: 'An electrically operated switch.', row: 3, col: 4, direction: 'down' },
    { answer: 'FUSE', clue: 'A safety device designed to open a circuit when current is too high.', row: 4, col: 6, direction: 'down' },
    { answer: 'WATT', clue: 'The SI unit of electrical power.', row: 4, col: 11, direction: 'across' },
    { answer: 'TRANSISTOR', clue: 'A semiconductor device commonly used for switching and amplification.', row: 6, col: 2, direction: 'across' },
    { answer: 'SIGNAL', clue: 'An electrical quantity that carries information.', row: 6, col: 8, direction: 'down' },
    { answer: 'OHM', clue: 'The SI unit of electrical resistance.', row: 6, col: 10, direction: 'down' },
    { answer: 'GROUND', clue: 'A reference point in a circuit, commonly treated as zero volts.', row: 9, col: 4, direction: 'across' },
    { answer: 'VOLTAGE', clue: 'The electrical potential difference between two points.', row: 11, col: 6, direction: 'across' }
  ];

  const CHALLENGE = {
    title: 'Electronics Technicalities',
    subtitle: 'Test your knowledge of electronics technical terminology.',
    instruction: 'Fill in each word using the clues. When you finish a word, EcE Hub checks it automatically. Correct words lock in place and the cursor moves to the next word.'
  };

  let crosswordGameState = null;
  let boardResizeObserver = null;

  const CROSSWORD_CSS = `
    .electronics-crossword-page {
      --cw-accent: #5b4be8;
      --cw-accent-dark: #4637d5;
      --cw-blue: #18aeea;
      --cw-ink: #12213b;
      --cw-muted: #64748b;
      --cw-border: #dbe3ef;
      --cw-panel: #ffffff;
      --cw-board: #18243d;
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px 32px 48px;
      color: var(--cw-ink);
      font-family: inherit;
    }

    .electronics-crossword-page,
    .electronics-crossword-page * { box-sizing: border-box; }

    .electronics-crossword-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 22px;
    }

    .electronics-crossword-header-copy { min-width: 0; }

    .electronics-crossword-eyebrow {
      display: block;
      margin: 1px 0 7px;
      color: #718096;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .electronics-crossword-header h1 {
      margin: 0;
      font-size: clamp(26px, 2.5vw, 36px);
      line-height: 1.1;
      letter-spacing: -.035em;
    }

    .electronics-crossword-header p {
      margin: 8px 0 0;
      color: var(--cw-muted);
      font-size: 15px;
      line-height: 1.5;
    }

    .electronics-crossword-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
      gap: 20px;
      align-items: start;
    }

    .electronics-crossword-card {
      min-width: 0;
      background: var(--cw-panel);
      border: 1px solid rgba(148,163,184,.28);
      border-radius: 20px;
      box-shadow: 0 12px 34px rgba(15,23,42,.07);
    }

    .electronics-crossword-board-card { padding: 20px; }

    .electronics-crossword-board-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .electronics-crossword-board-heading strong { font-size: 17px; }

    .electronics-crossword-board-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .electronics-crossword-board-tools > span {
      color: var(--cw-muted);
      font-size: 13px;
      white-space: nowrap;
    }

    .electronics-crossword-icon-btn,
    .electronics-crossword-page .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 38px;
      padding: 8px 13px;
      border: 1px solid var(--cw-border);
      border-radius: 9px;
      background: #fff;
      color: var(--cw-ink);
      font: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      transition: transform .12s ease, background .15s ease, border-color .15s ease;
    }

    .electronics-crossword-icon-btn:hover,
    .electronics-crossword-page .btn:hover { background: #f7f8fc; }
    .electronics-crossword-icon-btn:active,
    .electronics-crossword-page .btn:active { transform: translateY(1px); }

    .electronics-crossword-page .btn.primary {
      border-color: var(--cw-accent);
      background: var(--cw-accent);
      color: #fff;
    }

    .electronics-crossword-page .btn.primary:hover { background: var(--cw-accent-dark); }

    .electronics-crossword-board-shell {
      width: 100%;
      aspect-ratio: 15 / 12;
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      overflow: hidden;
      background: #f7f9fd;
      border: 1px solid #edf1f7;
      border-radius: 14px;
    }

    .electronics-crossword-board {
      --crossword-cell-size: 32px;
      display: grid;
      grid-template-columns: repeat(15, var(--crossword-cell-size));
      grid-template-rows: repeat(12, var(--crossword-cell-size));
      gap: 1px;
      width: max-content;
      height: max-content;
      flex: 0 0 auto;
      padding: 2px;
      background: var(--cw-board);
      border: 2px solid var(--cw-board);
      border-radius: 8px;
      overflow: hidden;
      user-select: none;
      touch-action: manipulation;
    }

    .electronics-crossword-block,
    .electronics-crossword-cell {
      width: var(--crossword-cell-size);
      height: var(--crossword-cell-size);
    }

    .electronics-crossword-block { background: var(--cw-board); }

    .electronics-crossword-cell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: #fff;
      color: var(--cw-ink);
      font: inherit;
      font-size: calc(var(--crossword-cell-size) * .42);
      font-weight: 850;
      cursor: pointer;
      transition: background .12s ease, box-shadow .12s ease, color .12s ease;
    }

    .electronics-crossword-cell:hover { background: #f0f2ff; }
    .electronics-crossword-cell.word-selected { background: #eae8ff; }

    .electronics-crossword-cell.selected {
      z-index: 2;
      background: var(--cw-accent);
      color: #fff;
      box-shadow: inset 0 0 0 2px var(--cw-accent-dark);
    }

    .electronics-crossword-cell.correct,
    .electronics-crossword-cell.locked {
      background: #dcfce7;
      color: #166534;
    }

    .electronics-crossword-cell.locked::after {
      content: '✓';
      position: absolute;
      right: 2px;
      bottom: 1px;
      font-size: max(7px, calc(var(--crossword-cell-size) * .18));
      font-weight: 900;
      color: #22a05a;
      pointer-events: none;
    }

    .electronics-crossword-cell.selected.locked {
      background: #b9edcf;
      color: #14532d;
      box-shadow: inset 0 0 0 2px #22a05a;
    }

    .electronics-crossword-cell.incorrect { background: #fee2e2; color: #b91c1c; }
    .electronics-crossword-cell.word-error { animation: crossword-wiggle .42s ease; }

    @keyframes crossword-wiggle {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-4px); }
      40% { transform: translateX(4px); }
      60% { transform: translateX(-3px); }
      80% { transform: translateX(3px); }
    }

    .electronics-crossword-number {
      position: absolute;
      top: 2px;
      left: 3px;
      color: #64748b;
      font-size: max(7px, calc(var(--crossword-cell-size) * .22));
      font-weight: 850;
      line-height: 1;
      pointer-events: none;
    }

    .electronics-crossword-cell.selected .electronics-crossword-number { color: #fff; }
    .electronics-crossword-cell.locked .electronics-crossword-number { color: #32805a; }
    .electronics-crossword-letter { margin-top: 3px; pointer-events: none; }

    .electronics-crossword-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 52px;
      margin-top: 14px;
      padding: 11px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      transition: background .2s ease, border-color .2s ease;
    }

    .electronics-crossword-status strong { font-size: 14px; }
    .electronics-crossword-status span { color: var(--cw-muted); font-size: 12px; text-align: right; }
    .electronics-crossword-status.complete { border-color: #bbf7d0; background: #f0fdf4; }
    .electronics-crossword-status.error { border-color: #fecaca; background: #fff7f7; }

    .electronics-crossword-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 12px;
    }

    .electronics-crossword-actions .btn { min-width: 118px; }

    .electronics-crossword-side {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }

    .electronics-crossword-howto { padding: 18px; }

    .electronics-crossword-howto-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--cw-ink);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      text-align: left;
    }

    .electronics-crossword-howto-title { display: flex; align-items: center; gap: 10px; }

    .electronics-crossword-howto-icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      flex: 0 0 38px;
      border-radius: 11px;
      background: #eeecff;
      font-size: 19px;
    }

    .electronics-crossword-howto-chevron { color: #64748b; transition: transform .15s ease; }
    .electronics-crossword-howto.open .electronics-crossword-howto-chevron { transform: rotate(180deg); }

    .electronics-crossword-howto-body {
      display: none;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #edf1f7;
    }

    .electronics-crossword-howto.open .electronics-crossword-howto-body { display: block; }
    .electronics-crossword-howto-body p,
    .electronics-crossword-howto-body li { color: var(--cw-muted); font-size: 13px; line-height: 1.65; }
    .electronics-crossword-howto-body p { margin: 0; }
    .electronics-crossword-howto-body ul { margin: 10px 0 0; padding-left: 18px; }

    .electronics-crossword-clues {
      padding: 18px;
      max-height: calc(100vh - 180px);
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .electronics-crossword-clue-section + .electronics-crossword-clue-section {
      margin-top: 22px;
      padding-top: 20px;
      border-top: 1px solid #edf1f7;
    }

    .electronics-crossword-clue-section h2 {
      margin: 0 0 9px;
      color: var(--cw-blue);
      font-size: 16px;
      font-weight: 850;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .electronics-crossword-clue-list { display: flex; flex-direction: column; gap: 3px; }

    .electronics-crossword-clue {
      width: 100%;
      display: grid;
      grid-template-columns: 34px minmax(0,1fr);
      gap: 7px;
      align-items: start;
      padding: 9px 8px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: #24324a;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    .electronics-crossword-clue:hover { background: #f6f7fb; }
    .electronics-crossword-clue.active { background: #eeecff; box-shadow: inset 3px 0 0 var(--cw-blue); }
    .electronics-crossword-clue.completed { background: #effaf3; }
    .electronics-crossword-clue.completed .electronics-crossword-clue-number { color: #16a05a; }
    .electronics-crossword-clue-number { color: var(--cw-blue); font-weight: 850; }
    .electronics-crossword-clue-text { color: #64748b; font-size: 13px; line-height: 1.45; }
    .electronics-crossword-clue.active .electronics-crossword-clue-text { color: #4033a7; }
    .electronics-crossword-clue.completed .electronics-crossword-clue-text { color: #397454; }

    .electronics-crossword-page:fullscreen {
      width: 100vw;
      max-width: none;
      height: 100vh;
      margin: 0;
      padding: 18px 22px 22px;
      overflow: hidden;
      background: var(--bg, #f6f8fc);
    }

    .electronics-crossword-page:fullscreen .electronics-crossword-layout {
      height: calc(100vh - 112px);
      grid-template-columns: minmax(0,1fr) minmax(320px,380px);
    }

    .electronics-crossword-page:fullscreen .electronics-crossword-board-card {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .electronics-crossword-page:fullscreen .electronics-crossword-board-shell {
      flex: 1 1 auto;
      min-height: 0;
      aspect-ratio: auto;
    }

    .electronics-crossword-page:fullscreen .electronics-crossword-clues {
      height: 100%;
      max-height: none;
    }

    @media (max-width: 1000px) {
      .electronics-crossword-page { padding: 22px 22px 38px; }
      .electronics-crossword-layout { grid-template-columns: 1fr; }
      .electronics-crossword-side {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
        align-items: start;
      }
      .electronics-crossword-clues { max-height: 520px; }
    }

    @media (max-width: 650px) {
      .electronics-crossword-page { padding: 18px 12px 30px; }
      .electronics-crossword-header { flex-direction: column; gap: 11px; }
      .electronics-crossword-board-card { padding: 12px; }
      .electronics-crossword-board-tools > span { display: none; }
      .electronics-crossword-side { display: flex; }
      .electronics-crossword-clues { max-height: none; }
      .electronics-crossword-status { align-items: flex-start; flex-direction: column; }
      .electronics-crossword-status span { text-align: left; }
      .electronics-crossword-actions { width: 100%; }
      .electronics-crossword-actions .btn { flex: 1 1 0; }
    }
  `;

  function injectStyles() {
    if (document.getElementById('electronics-crossword-styles')) return;
    const style = document.createElement('style');
    style.id = 'electronics-crossword-styles';
    style.textContent = CROSSWORD_CSS;
    document.head.appendChild(style);
  }

  function normalizeAnswer(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z]/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cellKey(row, col) { return `${row}-${col}`; }
  function entryKey(entry) { return `${entry.direction}:${entry.row}:${entry.col}:${normalizeAnswer(entry.answer)}`; }

  function getEntryCells(entry) {
    const answer = normalizeAnswer(entry.answer);
    return Array.from({ length: answer.length }, (_, i) => ({
      row: entry.row + (entry.direction === 'down' ? i : 0),
      col: entry.col + (entry.direction === 'across' ? i : 0)
    }));
  }

  function isInside(row, col) {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
  }

  function createBoard(entries) {
    const board = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => ({ active: false, number: null, entries: [], expected: '' }))
    );

    entries.forEach(entry => {
      const answer = normalizeAnswer(entry.answer);
      getEntryCells(entry).forEach((position, index) => {
        if (!isInside(position.row, position.col)) throw new Error(`Crossword entry ${answer} is outside the grid.`);
        const cell = board[position.row][position.col];
        const expected = answer[index];
        if (cell.expected && cell.expected !== expected) throw new Error(`Crossword crossing mismatch at ${position.row},${position.col}.`);
        cell.active = true;
        cell.expected = expected;
        if (!cell.entries.includes(entry)) cell.entries.push(entry);
      });
    });

    const starts = new Set();
    entries.forEach(entry => {
      const first = getEntryCells(entry)[0];
      const beforeRow = first.row + (entry.direction === 'down' ? -1 : 0);
      const beforeCol = first.col + (entry.direction === 'across' ? -1 : 0);
      if (!isInside(beforeRow, beforeCol) || !board[beforeRow][beforeCol].active) starts.add(cellKey(first.row, first.col));
    });

    Array.from(starts)
      .map(key => key.split('-').map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .forEach(([row, col], index) => { board[row][col].number = index + 1; });

    return board;
  }

  function resetElectronicsCrossword() {
    const entries = CROSSWORD_ENTRIES.map(entry => ({ ...entry, answer: normalizeAnswer(entry.answer) }));
    const board = createBoard(entries);

    crosswordGameState = {
      challenge: { ...CHALLENGE, entries },
      board,
      answers: {},
      lockedEntries: new Set(),
      selected: { row: entries[0].row, col: entries[0].col },
      direction: entries[0].direction,
      answered: false,
      correct: 0,
      total: board.flat().filter(cell => cell.active).length,
      lastErrorEntry: null
    };
  }

  function findEntryAtCell(row, col, direction) {
    if (!crosswordGameState) return null;
    return crosswordGameState.challenge.entries.find(entry =>
      entry.direction === direction && getEntryCells(entry).some(position => position.row === row && position.col === col)
    ) || null;
  }

  function getSelectedEntry() {
    if (!crosswordGameState?.selected) return null;
    const { row, col } = crosswordGameState.selected;
    return findEntryAtCell(row, col, crosswordGameState.direction);
  }

  function isEntryLocked(entry) {
    return !!entry && crosswordGameState?.lockedEntries?.has(entryKey(entry));
  }

  function isCellLockedForEntry(entry, row, col) {
    if (!entry || !crosswordGameState) return false;
    return isEntryLocked(entry) && getEntryCells(entry).some(position => position.row === row && position.col === col);
  }

  function getFirstEditableCell(entry) {
    if (!entry || !crosswordGameState) return null;
    return getEntryCells(entry).find(position => !isCellLockedForEntry(entry, position.row, position.col)) || null;
  }

  function getNextUnlockedEntry(entry) {
    if (!crosswordGameState) return null;
    const entries = crosswordGameState.challenge.entries;
    const index = entry ? entries.indexOf(entry) : -1;

    for (let offset = 1; offset <= entries.length; offset++) {
      const candidate = entries[(index + offset + entries.length) % entries.length];
      if (!isEntryLocked(candidate)) return candidate;
    }
    return null;
  }

  function selectCell(row, col) {
    if (!crosswordGameState) return;
    const cell = crosswordGameState.board[row]?.[col];
    if (!cell?.active) return;

    const selected = crosswordGameState.selected;
    const same = selected && selected.row === row && selected.col === col;

    if (same && cell.entries.length > 1) {
      const opposite = crosswordGameState.direction === 'across' ? 'down' : 'across';
      if (findEntryAtCell(row, col, opposite)) crosswordGameState.direction = opposite;
    } else if (!findEntryAtCell(row, col, crosswordGameState.direction)) {
      crosswordGameState.direction = findEntryAtCell(row, col, 'across') ? 'across' : 'down';
    }

    const entry = findEntryAtCell(row, col, crosswordGameState.direction);
    if (entry && isEntryLocked(entry)) {
      const opposite = crosswordGameState.direction === 'across' ? 'down' : 'across';
      const other = findEntryAtCell(row, col, opposite);
      if (other && !isEntryLocked(other)) crosswordGameState.direction = opposite;
    }

    crosswordGameState.selected = { row, col };
    crosswordGameState.lastErrorEntry = null;
    rerender();
  }

  function selectEntry(entry) {
    if (!entry || !crosswordGameState) return;

    if (isEntryLocked(entry)) {
      const next = getNextUnlockedEntry(entry);
      if (next) return selectEntry(next);
      return;
    }

    crosswordGameState.direction = entry.direction;
    const firstEditable = getFirstEditableCell(entry);
    const first = firstEditable || getEntryCells(entry)[0];
    crosswordGameState.selected = { row: first.row, col: first.col };
    crosswordGameState.lastErrorEntry = null;
    rerender();
  }

  function moveWithinWord(step) {
    const entry = getSelectedEntry();
    if (!entry || !crosswordGameState?.selected) return;

    const cells = getEntryCells(entry);
    const index = cells.findIndex(position => position.row === crosswordGameState.selected.row && position.col === crosswordGameState.selected.col);
    if (index < 0) return;

    let nextIndex = index + step;
    while (nextIndex >= 0 && nextIndex < cells.length) {
      const next = cells[nextIndex];
      if (!isCellLockedForEntry(entry, next.row, next.col)) {
        crosswordGameState.selected = { row: next.row, col: next.col };
        updateSelection();
        return;
      }
      nextIndex += step >= 0 ? 1 : -1;
    }

    updateSelection();
  }

  function moveToNextWord(entry) {
    const next = getNextUnlockedEntry(entry);
    if (!next) {
      crosswordGameState.selected = null;
      return;
    }

    crosswordGameState.direction = next.direction;
    const first = getFirstEditableCell(next) || getEntryCells(next)[0];
    crosswordGameState.selected = { row: first.row, col: first.col };
  }

  function wordIsComplete(entry) {
    if (!entry || !crosswordGameState) return false;
    return getEntryCells(entry).every(position => !!crosswordGameState.answers[cellKey(position.row, position.col)]);
  }

  function wordIsCorrect(entry) {
    if (!entry || !crosswordGameState) return false;
    const answer = normalizeAnswer(entry.answer);
    return getEntryCells(entry).every((position, index) =>
      (crosswordGameState.answers[cellKey(position.row, position.col)] || '') === answer[index]
    );
  }

  function lockEntry(entry) {
    if (!entry || !crosswordGameState) return;
    crosswordGameState.lockedEntries.add(entryKey(entry));
    crosswordGameState.lastErrorEntry = null;
    crosswordGameState.answered = false;
    updateCorrectCount();
  }

  function showWordError(entry) {
    if (!entry || !crosswordGameState) return;
    crosswordGameState.lastErrorEntry = entryKey(entry);
    crosswordGameState.answered = false;
    crosswordGameState.selected = getEntryCells(entry).find(position =>
      crosswordGameState.answers[cellKey(position.row, position.col)] !== normalizeAnswer(entry.answer)[getEntryCells(entry).findIndex(p => p.row === position.row && p.col === position.col)]
    ) || getEntryCells(entry)[0];

    renderCrosswordBoard();
    updateCrosswordStatus();

    const number = getEntryNumber(entry);
    const label = `${number} ${entry.direction === 'across' ? 'Across' : 'Down'}`;
    if (typeof window.toast === 'function') window.toast(`❌ ${label} isn't correct yet. Try again.`);

    setTimeout(() => {
      document.querySelectorAll('.electronics-crossword-cell.word-error').forEach(cell => cell.classList.remove('word-error'));
      crosswordGameState.lastErrorEntry = null;
      renderCrosswordBoard();
    }, 480);
  }

  function checkCompletedWord(entry) {
    if (!entry || isEntryLocked(entry) || !wordIsComplete(entry)) return false;

    if (wordIsCorrect(entry)) {
      lockEntry(entry);
      if (typeof window.toast === 'function') window.toast(`✓ ${getEntryNumber(entry)} ${entry.direction === 'across' ? 'Across' : 'Down'} correct!`);
      moveToNextWord(entry);
      renderCrosswordBoard();
      renderCrosswordClues();
      updateCrosswordStatus();
      checkForAllWordsComplete();
      return true;
    }

    showWordError(entry);
    return false;
  }

  function enterLetter(letter) {
    if (!crosswordGameState) return;
    const value = normalizeAnswer(letter).charAt(0);
    if (!value) return;

    let entry = getSelectedEntry();
    if (!entry) {
      const next = getNextUnlockedEntry(null);
      if (!next) return;
      selectEntry(next);
      entry = getSelectedEntry();
    }

    if (isEntryLocked(entry)) {
      moveToNextWord(entry);
      renderCrosswordBoard();
      renderCrosswordClues();
      return;
    }

    const selected = crosswordGameState.selected;
    if (!selected) return;

    if (isCellLockedForEntry(entry, selected.row, selected.col)) {
      moveWithinWord(1);
      entry = getSelectedEntry();
      if (!entry || !crosswordGameState.selected || isCellLockedForEntry(entry, crosswordGameState.selected.row, crosswordGameState.selected.col)) return;
    }

    const { row, col } = crosswordGameState.selected;
    crosswordGameState.answers[cellKey(row, col)] = value;
    crosswordGameState.answered = false;
    crosswordGameState.lastErrorEntry = null;

    if (wordIsComplete(entry)) {
      checkCompletedWord(entry);
      return;
    }

    moveWithinWord(1);
    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
  }

  function deleteLetter() {
    if (!crosswordGameState?.selected) return;
    const entry = getSelectedEntry();
    if (!entry || isEntryLocked(entry)) return;

    const { row, col } = crosswordGameState.selected;
    const key = cellKey(row, col);

    if (isCellLockedForEntry(entry, row, col)) {
      moveWithinWord(-1);
      return;
    }

    if (crosswordGameState.answers[key]) {
      delete crosswordGameState.answers[key];
      crosswordGameState.answered = false;
      renderCrosswordBoard();
      renderCrosswordClues();
      updateCrosswordStatus();
      return;
    }

    moveWithinWord(-1);
    const previous = crosswordGameState.selected;
    if (previous && !isCellLockedForEntry(entry, previous.row, previous.col)) {
      delete crosswordGameState.answers[cellKey(previous.row, previous.col)];
    }
    crosswordGameState.answered = false;
    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
  }

  function moveDirection(rowChange, colChange) {
    if (!crosswordGameState?.selected) return;

    let row = crosswordGameState.selected.row + rowChange;
    let col = crosswordGameState.selected.col + colChange;

    while (isInside(row, col)) {
      if (crosswordGameState.board[row][col].active) {
        crosswordGameState.selected = { row, col };
        if (colChange && findEntryAtCell(row, col, 'across')) crosswordGameState.direction = 'across';
        if (rowChange && findEntryAtCell(row, col, 'down')) crosswordGameState.direction = 'down';
        updateSelection();
        return;
      }
      row += rowChange;
      col += colChange;
    }
  }

  function toggleDirection() {
    if (!crosswordGameState?.selected) return;
    const opposite = crosswordGameState.direction === 'across' ? 'down' : 'across';
    const { row, col } = crosswordGameState.selected;
    const entry = findEntryAtCell(row, col, opposite);
    if (entry && !isEntryLocked(entry)) {
      crosswordGameState.direction = opposite;
      updateSelection();
      return;
    }
    if (entry) {
      const current = getSelectedEntry();
      if (current && !isEntryLocked(current)) return;
    }
  }

  function handleKeyboard(event) {
    if (!document.getElementById('electronicsCrosswordBoard')) return;
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;

    if (/^[a-zA-Z]$/.test(event.key)) { event.preventDefault(); enterLetter(event.key); return; }
    if (event.key === 'Backspace') { event.preventDefault(); deleteLetter(); return; }
    if (event.key === ' ') { event.preventDefault(); toggleDirection(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveDirection(0, 1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveDirection(0, -1); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); moveDirection(1, 0); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveDirection(-1, 0); }
  }

  function getEntryNumber(entry) {
    if (!entry || !crosswordGameState) return '?';
    const first = getEntryCells(entry)[0];
    return crosswordGameState.board[first.row][first.col].number || '?';
  }

  function renderCrosswordBoard() {
    const container = document.getElementById('electronicsCrosswordBoard');
    if (!container || !crosswordGameState) return;

    container.innerHTML = '';

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = crosswordGameState.board[row][col];

        if (!cell.active) {
          const block = document.createElement('div');
          block.className = 'electronics-crossword-block';
          container.appendChild(block);
          continue;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'electronics-crossword-cell';
        button.dataset.row = row;
        button.dataset.col = col;
        button.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);

        if (cell.number) {
          const number = document.createElement('span');
          number.className = 'electronics-crossword-number';
          number.textContent = cell.number;
          button.appendChild(number);
        }

        const letter = document.createElement('span');
        letter.className = 'electronics-crossword-letter';
        letter.textContent = crosswordGameState.answers[cellKey(row, col)] || '';
        button.appendChild(letter);

        const lockedHere = cell.entries.some(entry => isEntryLocked(entry));
        if (lockedHere) button.classList.add('locked', 'correct');

        if (crosswordGameState.lastErrorEntry && cell.entries.some(entry => entryKey(entry) === crosswordGameState.lastErrorEntry)) {
          button.classList.add('incorrect', 'word-error');
        }

        button.addEventListener('click', () => selectCell(row, col));
        container.appendChild(button);
      }
    }

    updateSelection();
    updateBoardSize();
  }

  function renderCrosswordClues() {
    const across = document.getElementById('electronicsCrosswordAcross');
    const down = document.getElementById('electronicsCrosswordDown');
    if (!across || !down || !crosswordGameState) return;

    across.innerHTML = '';
    down.innerHTML = '';

    const entries = [...crosswordGameState.challenge.entries].sort((a, b) => {
      const numberDifference = getEntryNumber(a) - getEntryNumber(b);
      return numberDifference || (a.direction === 'across' ? -1 : 1);
    });

    entries.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'electronics-crossword-clue';
      button.dataset.number = getEntryNumber(entry);
      button.dataset.direction = entry.direction;
      if (isEntryLocked(entry)) button.classList.add('completed');
      button.innerHTML = `<span class="electronics-crossword-clue-number">${getEntryNumber(entry)}.</span><span class="electronics-crossword-clue-text">${escapeHtml(entry.clue)}</span>`;
      button.addEventListener('click', () => selectEntry(entry));
      (entry.direction === 'across' ? across : down).appendChild(button);
    });
  }

  function updateSelection() {
    document.querySelectorAll('.electronics-crossword-cell').forEach(cell => cell.classList.remove('selected', 'word-selected'));
    document.querySelectorAll('.electronics-crossword-clue').forEach(clue => clue.classList.remove('active'));
    if (!crosswordGameState?.selected) return;

    const { row, col } = crosswordGameState.selected;
    const entry = findEntryAtCell(row, col, crosswordGameState.direction);

    if (entry) {
      getEntryCells(entry).forEach(position => {
        const cell = document.querySelector(`.electronics-crossword-cell[data-row="${position.row}"][data-col="${position.col}"]`);
        if (cell) cell.classList.add('word-selected');
      });

      const number = getEntryNumber(entry);
      const clue = document.querySelector(`.electronics-crossword-clue[data-number="${number}"][data-direction="${entry.direction}"]`);
      if (clue) clue.classList.add('active');
    }

    const selected = document.querySelector(`.electronics-crossword-cell[data-row="${row}"][data-col="${col}"]`);
    if (selected) selected.classList.add('selected');
  }

  function updateCorrectCount() {
    if (!crosswordGameState) return;
    const uniqueLockedCells = new Set();
    crosswordGameState.challenge.entries.forEach(entry => {
      if (isEntryLocked(entry)) getEntryCells(entry).forEach(position => uniqueLockedCells.add(cellKey(position.row, position.col)));
    });
    crosswordGameState.correct = uniqueLockedCells.size;
    crosswordGameState.total = crosswordGameState.board.flat().filter(cell => cell.active).length;
  }

  function checkForAllWordsComplete() {
    if (!crosswordGameState) return;
    const allLocked = crosswordGameState.challenge.entries.every(entry => isEntryLocked(entry));
    if (!allLocked) return;

    crosswordGameState.answered = true;
    crosswordGameState.selected = null;
    updateCorrectCount();
    updateCrosswordStatus();
    renderCrosswordClues();

    if (typeof window.toast === 'function') window.toast('🎉 Crossword complete! Every word is locked in.');
  }

  function submitElectronicsCrossword() {
    if (!crosswordGameState) return;

    crosswordGameState.challenge.entries.forEach(entry => {
      if (wordIsComplete(entry) && wordIsCorrect(entry)) lockEntry(entry);
    });

    updateCorrectCount();
    crosswordGameState.answered = true;

    if (crosswordGameState.challenge.entries.every(entry => isEntryLocked(entry))) {
      crosswordGameState.selected = null;
      if (typeof window.toast === 'function') window.toast('🎉 Crossword complete!');
    } else if (typeof window.toast === 'function') {
      window.toast(`${crosswordGameState.correct} of ${crosswordGameState.total} squares are correct.`);
    }

    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
  }

  function renderCrosswordResults() {
    updateCorrectCount();
    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
  }

  function updateCrosswordStatus() {
    const status = document.getElementById('electronicsCrosswordStatus');
    if (!status || !crosswordGameState) return;

    const allLocked = crosswordGameState.challenge.entries.every(entry => isEntryLocked(entry));
    if (allLocked) {
      status.className = 'electronics-crossword-status complete';
      status.innerHTML = '<strong>🎉 Crossword complete!</strong><span>Every word was solved correctly and locked.</span>';
      return;
    }

    if (crosswordGameState.lastErrorEntry) {
      const entry = crosswordGameState.challenge.entries.find(item => entryKey(item) === crosswordGameState.lastErrorEntry);
      status.className = 'electronics-crossword-status error';
      status.innerHTML = `<strong>Not quite — ${getEntryNumber(entry)} ${entry?.direction === 'across' ? 'Across' : 'Down'} needs another try.</strong><span>Finish the word correctly to lock it.</span>`;
      return;
    }

    const lockedWords = crosswordGameState.challenge.entries.filter(entry => isEntryLocked(entry)).length;
    status.className = 'electronics-crossword-status';
    status.innerHTML = lockedWords
      ? `<strong>${lockedWords} / ${crosswordGameState.challenge.entries.length} words locked</strong><span>Correct words lock automatically. Keep going.</span>`
      : '<strong>Ready to solve</strong><span>Finish a word to have it checked automatically.</span>';
  }

  function updateBoardSize() {
    const shell = document.querySelector('.electronics-crossword-board-shell');
    const board = document.getElementById('electronicsCrosswordBoard');
    if (!shell || !board) return;

    const rect = shell.getBoundingClientRect();
    const availableWidth = Math.max(0, rect.width - 20);
    const availableHeight = Math.max(0, rect.height - 20);
    const size = Math.floor(Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS));

    if (Number.isFinite(size) && size > 0) board.style.setProperty('--crossword-cell-size', `${Math.max(16, Math.min(52, size))}px`);
  }

  function observeBoard() {
    if (boardResizeObserver) boardResizeObserver.disconnect();
    const shell = document.querySelector('.electronics-crossword-board-shell');
    if (!shell) return;

    updateBoardSize();
    if ('ResizeObserver' in window) {
      boardResizeObserver = new ResizeObserver(updateBoardSize);
      boardResizeObserver.observe(shell);
    }
    requestAnimationFrame(updateBoardSize);
  }

  function initializeCrosswordDOM() {
    requestAnimationFrame(() => {
      renderCrosswordBoard();
      renderCrosswordClues();
      updateCrosswordStatus();
      observeBoard();
    });
  }

  function rerender() {
    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
    observeBoard();
  }

  async function toggleCrosswordFullscreen() {
    const page = document.querySelector('.electronics-crossword-page');
    if (!page) return;

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (page.requestFullscreen) await page.requestFullscreen();
    } catch (error) {
      console.warn('EcE Hub crossword fullscreen unavailable:', error);
      if (typeof window.toast === 'function') window.toast('Fullscreen is not available in this browser.');
    }
  }

  function toggleHowToPlay() {
    const panel = document.getElementById('electronicsCrosswordHowTo');
    const button = document.getElementById('electronicsCrosswordHowToButton');
    if (!panel || !button) return;
    const open = panel.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  }

  function updateFullscreenButton() {
    const button = document.getElementById('electronicsCrosswordFullscreen');
    if (!button) return;
    button.textContent = document.fullscreenElement ? '⤢ Exit Fullscreen' : '⛶ Fullscreen';
    requestAnimationFrame(updateBoardSize);
  }

  function electronicsCrosswordView() {
    injectStyles();
    if (!crosswordGameState) resetElectronicsCrossword();
    const challenge = crosswordGameState.challenge;

    const html = `
      <section class="electronics-crossword-page">
        <header class="electronics-crossword-header">
          <button type="button" class="btn" data-action="exit-electronics-crossword">← Exit</button>
          <div class="electronics-crossword-header-copy">
            <span class="electronics-crossword-eyebrow">ELECTRONICS • GAME</span>
            <h1>${escapeHtml(challenge.title)}</h1>
            <p>${escapeHtml(challenge.subtitle)}</p>
          </div>
        </header>

        <section class="electronics-crossword-layout">
          <section class="electronics-crossword-card electronics-crossword-board-card">
            <div class="electronics-crossword-board-heading">
              <strong>Crossword</strong>
              <div class="electronics-crossword-board-tools">
                <span>${challenge.entries.length} clues</span>
                <button type="button" id="electronicsCrosswordFullscreen" class="electronics-crossword-icon-btn" data-action="crossword-fullscreen">⛶ Fullscreen</button>
              </div>
            </div>

            <div class="electronics-crossword-board-shell">
              <div id="electronicsCrosswordBoard" class="electronics-crossword-board" aria-label="Electronics crossword board"></div>
            </div>

            <div id="electronicsCrosswordStatus" class="electronics-crossword-status"></div>

            <div class="electronics-crossword-actions">
              <button type="button" class="btn" data-action="crossword-clear">Clear</button>
              <button type="button" class="btn primary" data-action="crossword-submit">Check Answers</button>
            </div>
          </section>

          <aside class="electronics-crossword-side">
            <section id="electronicsCrosswordHowTo" class="electronics-crossword-card electronics-crossword-howto open">
              <button type="button" id="electronicsCrosswordHowToButton" class="electronics-crossword-howto-toggle" data-action="crossword-howto" aria-expanded="true">
                <span class="electronics-crossword-howto-title">
                  <span class="electronics-crossword-howto-icon">🧩</span>
                  <span>How to play</span>
                </span>
                <span class="electronics-crossword-howto-chevron">▾</span>
              </button>
              <div class="electronics-crossword-howto-body">
                <p>${escapeHtml(challenge.instruction)}</p>
                <ul>
                  <li>Type a complete word; it is checked when you reach its final square.</li>
                  <li>Correct words turn green and lock.</li>
                  <li>After a correct word, typing continues at the next unsolved word.</li>
                  <li>A wrong completed word wiggles and stays editable.</li>
                  <li>Use <strong>Space</strong> or click an intersection to switch Across / Down.</li>
                </ul>
              </div>
            </section>

            <section class="electronics-crossword-card electronics-crossword-clues">
              <section class="electronics-crossword-clue-section">
                <h2>Across</h2>
                <div id="electronicsCrosswordAcross" class="electronics-crossword-clue-list"></div>
              </section>
              <section class="electronics-crossword-clue-section">
                <h2>Down</h2>
                <div id="electronicsCrosswordDown" class="electronics-crossword-clue-list"></div>
              </section>
            </section>
          </aside>
        </section>
      </section>
    `;

    initializeCrosswordDOM();
    return html;
  }

  function startElectronicsCrossword() {
    injectStyles();
    resetElectronicsCrossword();
    if (typeof window.go === 'function') window.go('explore-crossword');
  }

  function clearElectronicsCrossword() {
    if (!crosswordGameState) return;
    crosswordGameState.answers = {};
    crosswordGameState.lockedEntries = new Set();
    crosswordGameState.answered = false;
    crosswordGameState.correct = 0;
    crosswordGameState.lastErrorEntry = null;
    crosswordGameState.selected = { row: crosswordGameState.challenge.entries[0].row, col: crosswordGameState.challenge.entries[0].col };
    crosswordGameState.direction = crosswordGameState.challenge.entries[0].direction;
    rerender();
  }

  async function exitElectronicsCrossword() {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (_) {}
    }
    crosswordGameState = null;
    if (boardResizeObserver) boardResizeObserver.disconnect();
    boardResizeObserver = null;
    if (typeof window.go === 'function') window.go('explore');
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    switch (target.dataset.action) {
      case 'crossword-fullscreen':
        event.preventDefault();
        toggleCrosswordFullscreen();
        break;
      case 'crossword-howto':
        event.preventDefault();
        toggleHowToPlay();
        break;
      case 'crossword-submit':
        event.preventDefault();
        submitElectronicsCrossword();
        break;
      case 'crossword-clear':
        event.preventDefault();
        clearElectronicsCrossword();
        break;
      case 'exit-electronics-crossword':
        event.preventDefault();
        exitElectronicsCrossword();
        break;
    }
  });

  document.addEventListener('fullscreenchange', () => {
    updateFullscreenButton();
    observeBoard();
  });

  document.addEventListener('keydown', handleKeyboard);

  window.ExploreGames = window.ExploreGames || {};
  Object.assign(window.ExploreGames, {
    electronicsCrosswordView,
    startElectronicsCrossword,
    submitElectronicsCrossword,
    clearElectronicsCrossword,
    exitElectronicsCrossword
  });

  console.log('EcE Hub Electronics Crossword loaded');
})();
