/* ============================================================
   EcE Hub — Electronics Crossword
   ============================================================

   Responsive, true-grid crossword game for Explore.

   Public API:
   - electronicsCrosswordView()
   - startElectronicsCrossword()
   - submitElectronicsCrossword()
   - clearElectronicsCrossword()
   - exitElectronicsCrossword()

   UX:
   - real crossword intersections
   - Across / Down selection
   - keyboard navigation
   - responsive board that always fits its container
   - optional full-screen game mode
   - collapsible How to Play panel
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
    id: 1,
    title: 'Electronics Technicalities',
    subtitle: 'Test your knowledge of electronics technical terminology.',
    instruction: 'Fill in the crossword using the clues. Click a square to select a word, then type the letters. Click an intersection again or press Space to switch between Across and Down.',
    entries: CROSSWORD_ENTRIES
  };

  let crosswordGameState = null;
  let boardResizeObserver = null;

  const CROSSWORD_CSS = `
    .electronics-crossword-page{--cw-accent:#5b4be8;--cw-accent-strong:#4637d5;--cw-ink:#12213b;--cw-muted:#64748b;--cw-border:#dbe3ef;--cw-panel:#fff;--cw-soft:#f6f8fc;--cw-board-bg:#18243d;--cw-cell:#fff;--cw-cell-size:36px;width:100%;max-width:1440px;margin:0 auto;padding:28px 32px 48px;color:var(--cw-ink);font-family:inherit}
    .electronics-crossword-page,.electronics-crossword-page *{box-sizing:border-box}
    .electronics-crossword-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:22px}
    .electronics-crossword-header .btn{flex:0 0 auto;margin-top:1px}
    .electronics-crossword-header-copy{min-width:0}
    .electronics-crossword-eyebrow{display:block;margin:1px 0 7px;color:#718096;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
    .electronics-crossword-header h1{margin:0;color:var(--cw-ink);font-size:clamp(26px,2.5vw,36px);line-height:1.1;letter-spacing:-.035em}
    .electronics-crossword-header p{margin:8px 0 0;color:var(--cw-muted);font-size:15px;line-height:1.5}
    .electronics-crossword-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,360px);gap:20px;align-items:start}
    .electronics-crossword-card{min-width:0;background:var(--cw-panel);border:1px solid rgba(148,163,184,.28);border-radius:20px;box-shadow:0 12px 34px rgba(15,23,42,.07)}
    .electronics-crossword-board-card{padding:20px}
    .electronics-crossword-board-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .electronics-crossword-board-heading strong{font-size:17px;line-height:1.2}
    .electronics-crossword-board-heading span{color:var(--cw-muted);font-size:13px;white-space:nowrap}
    .electronics-crossword-board-tools{display:flex;align-items:center;gap:8px}
    .electronics-crossword-icon-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:7px 11px;border:1px solid var(--cw-border);border-radius:9px;background:#fff;color:var(--cw-ink);font:inherit;font-size:12px;font-weight:750;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .1s ease}
    .electronics-crossword-icon-btn:hover{background:#f7f8fc;border-color:#cbd5e1}
    .electronics-crossword-icon-btn:active{transform:scale(.98)}
    .electronics-crossword-board-shell{container-type:inline-size;width:100%;display:flex;align-items:center;justify-content:center;padding:4px;overflow:hidden;aspect-ratio:15 / 12;min-height:0;background:#f7f9fd;border:1px solid #edf1f7;border-radius:14px}
    .electronics-crossword-board{--crossword-cell-size:36px;display:grid;grid-template-columns:repeat(15,var(--crossword-cell-size));grid-template-rows:repeat(12,var(--crossword-cell-size));width:max-content;height:max-content;flex:0 0 auto;gap:1px;padding:2px;background:var(--cw-board-bg);border:2px solid var(--cw-board-bg);border-radius:8px;overflow:hidden;user-select:none;touch-action:manipulation}
    .electronics-crossword-block{width:var(--crossword-cell-size);height:var(--crossword-cell-size);background:var(--cw-board-bg)}
    .electronics-crossword-cell{position:relative;display:flex;align-items:center;justify-content:center;width:var(--crossword-cell-size);height:var(--crossword-cell-size);margin:0;padding:0;border:0;border-radius:0;background:var(--cw-cell);color:var(--cw-ink);font:inherit;font-size:calc(var(--crossword-cell-size) * .42);font-weight:850;line-height:1;cursor:pointer;user-select:none;transition:background .12s ease,box-shadow .12s ease,color .12s ease}
    .electronics-crossword-cell:hover{background:#f0f2ff}
    .electronics-crossword-cell.word-selected{background:#eae8ff}
    .electronics-crossword-cell.selected{z-index:2;background:var(--cw-accent);color:#fff;box-shadow:inset 0 0 0 2px var(--cw-accent-strong)}
    .electronics-crossword-cell.correct{background:#dcfce7;color:#166534}
    .electronics-crossword-cell.incorrect{background:#fee2e2;color:#b91c1c}
    .electronics-crossword-cell.selected.correct,.electronics-crossword-cell.selected.incorrect{color:#fff}
    .electronics-crossword-number{position:absolute;top:2px;left:3px;color:#64748b;font-size:max(7px,calc(var(--crossword-cell-size) * .22));font-weight:850;line-height:1;pointer-events:none}
    .electronics-crossword-cell.selected .electronics-crossword-number{color:rgba(255,255,255,.96)}
    .electronics-crossword-letter{margin-top:3px;pointer-events:none}
    .electronics-crossword-status{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:52px;margin-top:14px;padding:11px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
    .electronics-crossword-status strong{font-size:14px}
    .electronics-crossword-status span{color:var(--cw-muted);font-size:12px;text-align:right}
    .electronics-crossword-status.complete{border-color:#bbf7d0;background:#f0fdf4}
    .electronics-crossword-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
    .electronics-crossword-actions .btn{min-width:118px}
    .electronics-crossword-side{display:flex;flex-direction:column;gap:14px;min-width:0}
    .electronics-crossword-howto{padding:18px}
    .electronics-crossword-howto-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0;border:0;background:transparent;color:var(--cw-ink);font:inherit;font-weight:800;cursor:pointer;text-align:left}
    .electronics-crossword-howto-title{display:flex;align-items:center;gap:10px}
    .electronics-crossword-howto-icon{width:38px;height:38px;display:grid;place-items:center;flex:0 0 38px;border-radius:11px;background:#eeecff;font-size:19px}
    .electronics-crossword-howto-chevron{color:#64748b;transition:transform .15s ease}
    .electronics-crossword-howto.open .electronics-crossword-howto-chevron{transform:rotate(180deg)}
    .electronics-crossword-howto-body{display:none;margin-top:14px;padding-top:14px;border-top:1px solid #edf1f7}
    .electronics-crossword-howto.open .electronics-crossword-howto-body{display:block}
    .electronics-crossword-howto-body p{margin:0;color:var(--cw-muted);font-size:13px;line-height:1.65}
    .electronics-crossword-howto-body ul{margin:10px 0 0;padding-left:18px;color:var(--cw-muted);font-size:13px;line-height:1.65}
    .electronics-crossword-clues{padding:18px;max-height:calc(100vh - 180px);overflow:auto;overscroll-behavior:contain}
    .electronics-crossword-clue-section+.electronics-crossword-clue-section{margin-top:22px;padding-top:20px;border-top:1px solid #edf1f7}
    .electronics-crossword-clue-section h2{margin:0 0 9px;color:#1da9e9;font-size:16px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
    .electronics-crossword-clue-list{display:flex;flex-direction:column;gap:3px}
    .electronics-crossword-clue{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);gap:7px;align-items:start;padding:9px 8px;border:0;border-radius:10px;background:transparent;color:#24324a;cursor:pointer;text-align:left;font:inherit}
    .electronics-crossword-clue:hover{background:#f6f7fb}
    .electronics-crossword-clue.active{background:#eeecff;color:#4033a7;box-shadow:inset 3px 0 0 #22b7f2}
    .electronics-crossword-clue-number{color:#18aeea;font-weight:850}
    .electronics-crossword-clue-text{color:#64748b;font-size:13px;line-height:1.45}
    .electronics-crossword-clue.active .electronics-crossword-clue-text{color:#4033a7}
    .electronics-crossword-page:fullscreen{max-width:none;width:100vw;height:100vh;margin:0;padding:18px 22px 22px;overflow:hidden;background:var(--bg,#f6f8fc)}
    .electronics-crossword-page:fullscreen .electronics-crossword-header{margin-bottom:14px}
    .electronics-crossword-page:fullscreen .electronics-crossword-layout{height:calc(100vh - 112px);grid-template-columns:minmax(0,1fr) minmax(320px,380px)}
    .electronics-crossword-page:fullscreen .electronics-crossword-board-card{height:100%;min-height:0;display:flex;flex-direction:column}
    .electronics-crossword-page:fullscreen .electronics-crossword-board-shell{flex:1 1 auto;aspect-ratio:auto;min-height:0}
    .electronics-crossword-page:fullscreen .electronics-crossword-board{--crossword-cell-size:clamp(24px,min(calc((100cqw - 14px) / 15),calc((100cqh - 14px) / 12)),52px)}
    .electronics-crossword-page:fullscreen .electronics-crossword-clues{height:100%;max-height:none}
    .electronics-crossword-page:fullscreen .electronics-crossword-side{height:100%;min-height:0}
    .electronics-crossword-page .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:8px 13px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:var(--cw-ink);font:inherit;font-size:13px;font-weight:750;cursor:pointer}
    .electronics-crossword-page .btn:hover{background:#f7f8fc}
    .electronics-crossword-page .btn.primary{border-color:#5b4be8;background:#5b4be8;color:#fff}
    .electronics-crossword-page .btn.primary:hover{background:#4d3fd0}
    @media(max-width:1100px){.electronics-crossword-page{padding:22px 22px 38px}.electronics-crossword-layout{grid-template-columns:minmax(0,1fr) minmax(280px,330px)}}
    @media(max-width:900px){.electronics-crossword-layout{grid-template-columns:1fr}.electronics-crossword-side{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);align-items:start}.electronics-crossword-clues{max-height:520px}.electronics-crossword-page:fullscreen .electronics-crossword-layout{grid-template-columns:1fr;height:auto;overflow:auto}.electronics-crossword-page:fullscreen{overflow:auto}.electronics-crossword-page:fullscreen .electronics-crossword-board-card{height:auto}.electronics-crossword-page:fullscreen .electronics-crossword-board-shell{aspect-ratio:15 / 12}.electronics-crossword-page:fullscreen .electronics-crossword-side{height:auto;display:grid}}
    @media(max-width:650px){.electronics-crossword-page{padding:18px 12px 30px}.electronics-crossword-header{flex-direction:column;gap:11px}.electronics-crossword-board-card{padding:12px}.electronics-crossword-board-heading{align-items:flex-start}.electronics-crossword-board-tools{flex-wrap:wrap}.electronics-crossword-board-heading>span{display:none}.electronics-crossword-side{display:flex}.electronics-crossword-clues{max-height:none}.electronics-crossword-status{align-items:flex-start;flex-direction:column}.electronics-crossword-status span{text-align:left}.electronics-crossword-actions{width:100%}.electronics-crossword-actions .btn{flex:1 1 0}.electronics-crossword-page:fullscreen{padding:10px}.electronics-crossword-page:fullscreen .electronics-crossword-header{margin-bottom:10px}}
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
    return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function cellKey(row, col) {
    return `${row}-${col}`;
  }

  function getEntryCells(entry) {
    const answer = normalizeAnswer(entry.answer);
    const cells = [];
    for (let i = 0; i < answer.length; i++) {
      cells.push({
        row: entry.row + (entry.direction === 'down' ? i : 0),
        col: entry.col + (entry.direction === 'across' ? i : 0)
      });
    }
    return cells;
  }

  function isInside(row, col) {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
  }

  function createBoard(entries) {
    const board = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ({ active: false, number: null, entries: [], expected: null })));

    entries.forEach(entry => {
      const answer = normalizeAnswer(entry.answer);
      getEntryCells(entry).forEach((position, index) => {
        if (!isInside(position.row, position.col)) throw new Error(`Crossword entry "${answer}" is outside the grid.`);
        const cell = board[position.row][position.col];
        const expected = answer[index];
        if (cell.active && cell.expected && cell.expected !== expected) throw new Error(`Invalid crossword crossing at ${position.row},${position.col}.`);
        cell.active = true;
        cell.expected = expected;
        if (!cell.entries.includes(entry)) cell.entries.push(entry);
      });
    });

    const starts = new Map();
    entries.forEach(entry => {
      const first = getEntryCells(entry)[0];
      const before = {
        row: first.row + (entry.direction === 'down' ? -1 : 0),
        col: first.col + (entry.direction === 'across' ? -1 : 0)
      };
      const startsWord = !isInside(before.row, before.col) || !board[before.row][before.col].active;
      if (startsWord) starts.set(cellKey(first.row, first.col), { row: first.row, col: first.col });
    });

    Array.from(starts.values()).sort((a, b) => a.row - b.row || a.col - b.col).forEach((start, index) => {
      board[start.row][start.col].number = index + 1;
    });

    return board;
  }

  function validateLayout(entries, board) {
    const occupied = new Map();
    entries.forEach(entry => {
      getEntryCells(entry).forEach((position, index) => {
        const key = cellKey(position.row, position.col);
        const letter = normalizeAnswer(entry.answer)[index];
        if (!occupied.has(key)) occupied.set(key, []);
        occupied.get(key).push({ direction: entry.direction, letter });
      });
    });

    for (const [key, uses] of occupied) {
      const directions = new Set();
      uses.forEach(use => {
        if (directions.has(use.direction)) throw new Error(`Two ${use.direction} entries overlap at ${key}.`);
        directions.add(use.direction);
      });
      if (uses.length > 1 && uses.some(use => use.letter !== uses[0].letter)) throw new Error(`Crossing letters do not match at ${key}.`);
    }

    entries.forEach(entry => {
      const ownKeys = new Set(getEntryCells(entry).map(position => cellKey(position.row, position.col)));
      getEntryCells(entry).forEach(position => {
        const neighbors = entry.direction === 'across'
          ? [{ row: position.row - 1, col: position.col }, { row: position.row + 1, col: position.col }]
          : [{ row: position.row, col: position.col - 1 }, { row: position.row, col: position.col + 1 }];
        neighbors.forEach(neighbor => {
          if (!isInside(neighbor.row, neighbor.col)) return;
          const key = cellKey(neighbor.row, neighbor.col);
          if (board[neighbor.row][neighbor.col].active && !ownKeys.has(key)) {
            const crossingEntry = board[neighbor.row][neighbor.col].entries.find(other => other.direction !== entry.direction);
            if (!crossingEntry) throw new Error(`Invalid adjacent crossword entries near ${key}.`);
          }
        });
      });
    });
  }

  function resetElectronicsCrossword() {
    const entries = CROSSWORD_ENTRIES.map(entry => ({ ...entry, answer: normalizeAnswer(entry.answer) }));
    const board = createBoard(entries);
    validateLayout(entries, board);
    const firstEntry = entries[0];

    crosswordGameState = {
      challenge: { ...CHALLENGE, entries },
      board,
      answers: {},
      selected: { row: firstEntry.row, col: firstEntry.col },
      direction: firstEntry.direction,
      answered: false,
      correct: 0,
      total: board.flat().filter(cell => cell.active).length
    };
  }

  function findEntryAtCell(row, col, direction) {
    if (!crosswordGameState) return null;
    return crosswordGameState.challenge.entries.find(entry => entry.direction === direction && getEntryCells(entry).some(position => position.row === row && position.col === col)) || null;
  }

  function getSelectedEntry() {
    if (!crosswordGameState?.selected) return null;
    return findEntryAtCell(crosswordGameState.selected.row, crosswordGameState.selected.col, crosswordGameState.direction);
  }

  function selectCell(row, col) {
    if (!crosswordGameState) return;
    const cell = crosswordGameState.board[row]?.[col];
    if (!cell?.active) return;

    const sameCell = crosswordGameState.selected && crosswordGameState.selected.row === row && crosswordGameState.selected.col === col;

    if (sameCell && cell.entries.length > 1) {
      const opposite = crosswordGameState.direction === 'across' ? 'down' : 'across';
      if (findEntryAtCell(row, col, opposite)) crosswordGameState.direction = opposite;
    } else if (!findEntryAtCell(row, col, crosswordGameState.direction)) {
      crosswordGameState.direction = findEntryAtCell(row, col, 'across') ? 'across' : 'down';
    }

    crosswordGameState.selected = { row, col };
    rerender();
  }

  function selectEntry(entry) {
    if (!entry || !crosswordGameState) return;
    crosswordGameState.direction = entry.direction;
    crosswordGameState.selected = { row: entry.row, col: entry.col };
    rerender();
  }

  function moveWithinWord(step) {
    if (!crosswordGameState?.selected) return;
    const entry = getSelectedEntry();
    if (!entry) return;
    const cells = getEntryCells(entry);
    const currentIndex = cells.findIndex(position => position.row === crosswordGameState.selected.row && position.col === crosswordGameState.selected.col);
    if (currentIndex < 0) return;

    const nextIndex = Math.max(0, Math.min(cells.length - 1, currentIndex + step));
    const next = cells[nextIndex];
    crosswordGameState.selected = { row: next.row, col: next.col };
    updateSelection();
  }

  function enterLetter(letter) {
    if (!crosswordGameState) return;

    if (!crosswordGameState.selected) {
      const first = crosswordGameState.challenge.entries[0];
      if (first) {
        crosswordGameState.selected = { row: first.row, col: first.col };
        crosswordGameState.direction = first.direction;
      }
    }

    if (!crosswordGameState.selected) return;

    const value = normalizeAnswer(letter).charAt(0);
    if (!value) return;

    const { row, col } = crosswordGameState.selected;
    crosswordGameState.answers[cellKey(row, col)] = value;
    crosswordGameState.answered = false;

    renderCrosswordBoard();
    moveWithinWord(1);
  }

  function deleteLetter() {
    if (!crosswordGameState?.selected) return;
    const { row, col } = crosswordGameState.selected;
    const key = cellKey(row, col);

    if (crosswordGameState.answers[key]) {
      delete crosswordGameState.answers[key];
      crosswordGameState.answered = false;
      renderCrosswordBoard();
      return;
    }

    moveWithinWord(-1);
    if (!crosswordGameState.selected) return;

    const previousKey = cellKey(crosswordGameState.selected.row, crosswordGameState.selected.col);
    delete crosswordGameState.answers[previousKey];
    crosswordGameState.answered = false;
    renderCrosswordBoard();
  }

  function moveDirection(rowChange, colChange) {
    if (!crosswordGameState?.selected) return;

    let row = crosswordGameState.selected.row + rowChange;
    let col = crosswordGameState.selected.col + colChange;

    while (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      const cell = crosswordGameState.board[row][col];
      if (cell?.active) {
        crosswordGameState.selected = { row, col };
        if (colChange !== 0 && findEntryAtCell(row, col, 'across')) crosswordGameState.direction = 'across';
        else if (rowChange !== 0 && findEntryAtCell(row, col, 'down')) crosswordGameState.direction = 'down';
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
    if (findEntryAtCell(row, col, opposite)) {
      crosswordGameState.direction = opposite;
      updateSelection();
    }
  }

  function handleKeyboard(event) {
    if (!document.getElementById('electronicsCrosswordBoard')) return;
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;

    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      enterLetter(event.key);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      deleteLetter();
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      toggleDirection();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveDirection(0, 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveDirection(0, -1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveDirection(1, 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveDirection(-1, 0);
    }
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
      const aStart = getEntryCells(a)[0];
      const bStart = getEntryCells(b)[0];
      return aStart.row - bStart.row || aStart.col - bStart.col || (a.direction === 'across' ? -1 : 1);
    });

    entries.forEach(entry => {
      const first = getEntryCells(entry)[0];
      const number = crosswordGameState.board[first.row][first.col].number;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'electronics-crossword-clue';
      button.dataset.number = number;
      button.dataset.direction = entry.direction;
      button.innerHTML = `<span class="electronics-crossword-clue-number">${number}.</span><span class="electronics-crossword-clue-text">${escapeHtml(entry.clue)}</span>`;
      button.addEventListener('click', () => selectEntry(entry));
      if (entry.direction === 'across') across.appendChild(button);
      else down.appendChild(button);
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

      const first = getEntryCells(entry)[0];
      const number = crosswordGameState.board[first.row][first.col].number;
      const clue = document.querySelector(`.electronics-crossword-clue[data-number="${number}"][data-direction="${entry.direction}"]`);
      if (clue) {
        clue.classList.add('active');
        clue.scrollIntoView({ block: 'nearest' });
      }
    }

    const selected = document.querySelector(`.electronics-crossword-cell[data-row="${row}"][data-col="${col}"]`);
    if (selected) selected.classList.add('selected');
  }

  function submitElectronicsCrossword() {
    if (!crosswordGameState) return;

    const checked = new Set();
    let correct = 0;
    let total = 0;

    crosswordGameState.challenge.entries.forEach(entry => {
      const answer = normalizeAnswer(entry.answer);
      getEntryCells(entry).forEach((position, index) => {
        const key = cellKey(position.row, position.col);
        if (checked.has(key)) return;
        checked.add(key);
        total++;
        const submitted = crosswordGameState.answers[key] || '';
        if (submitted === answer[index]) correct++;
      });
    });

    crosswordGameState.correct = correct;
    crosswordGameState.total = total;
    crosswordGameState.answered = true;
    renderCrosswordResults();

    if (correct === total && total > 0) {
      if (typeof window.toast === 'function') window.toast('🎉 Crossword complete!');
    } else if (typeof window.toast === 'function') {
      window.toast(`${correct} of ${total} letters correct`);
    }
  }

  function renderCrosswordResults() {
    if (!crosswordGameState) return;

    crosswordGameState.challenge.entries.forEach(entry => {
      const answer = normalizeAnswer(entry.answer);
      getEntryCells(entry).forEach((position, index) => {
        const key = cellKey(position.row, position.col);
        const cell = document.querySelector(`.electronics-crossword-cell[data-row="${position.row}"][data-col="${position.col}"]`);
        if (!cell) return;
        cell.classList.remove('correct', 'incorrect');
        const submitted = crosswordGameState.answers[key];
        if (!submitted) return;
        cell.classList.add(submitted === answer[index] ? 'correct' : 'incorrect');
      });
    });

    updateCrosswordStatus();
  }

  function updateCrosswordStatus() {
    const status = document.getElementById('electronicsCrosswordStatus');
    if (!status || !crosswordGameState) return;

    const { correct, total, answered } = crosswordGameState;

    if (answered && correct === total && total > 0) {
      status.className = 'electronics-crossword-status complete';
      status.innerHTML = '<strong>🎉 Crossword complete!</strong><span>You solved every electronics term correctly.</span>';
      return;
    }

    status.className = 'electronics-crossword-status';

    if (!answered) {
      status.innerHTML = '<strong>Ready to solve</strong><span>Fill the grid, then check your answers.</span>';
      return;
    }

    status.innerHTML = `<strong>${correct} / ${total} correct</strong><span>Review the highlighted squares and try again.</span>`;
  }

  function updateBoardSize() {
    const shell = document.querySelector('.electronics-crossword-board-shell');
    const board = document.getElementById('electronicsCrosswordBoard');
    if (!shell || !board) return;

    const rect = shell.getBoundingClientRect();
    const availableWidth = Math.max(0, rect.width - 12);
    const availableHeight = Math.max(0, rect.height - 12);

    let cellSize = Math.floor(Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS));
    if (!Number.isFinite(cellSize) || cellSize < 1) cellSize = Math.floor(availableWidth / GRID_COLS);
    cellSize = Math.max(22, Math.min(52, cellSize));

    board.style.setProperty('--crossword-cell-size', `${cellSize}px`);
  }

  function observeBoard() {
    if (boardResizeObserver) {
      boardResizeObserver.disconnect();
      boardResizeObserver = null;
    }

    const shell = document.querySelector('.electronics-crossword-board-shell');
    if (!shell) return;

    updateBoardSize();

    if ('ResizeObserver' in window) {
      boardResizeObserver = new ResizeObserver(updateBoardSize);
      boardResizeObserver.observe(shell);
    }

    window.requestAnimationFrame(updateBoardSize);
  }

  function toggleHowToPlay() {
    const panel = document.getElementById('electronicsCrosswordHowTo');
    const button = document.getElementById('electronicsCrosswordHowToButton');
    if (!panel || !button) return;

    const open = panel.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
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

  function updateFullscreenButton() {
    const button = document.getElementById('electronicsCrosswordFullscreen');
    if (!button) return;

    const active = document.fullscreenElement != null;
    button.innerHTML = active ? '⤢ Exit Fullscreen' : '⛶ Fullscreen';
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Open crossword fullscreen');
    window.requestAnimationFrame(updateBoardSize);
  }

  function rerender() {
    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
    updateFullscreenButton();
    observeBoard();
  }

  function electronicsCrosswordView() {
    injectStyles();
    if (!crosswordGameState) resetElectronicsCrossword();

    const challenge = crosswordGameState.challenge;

    return `
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
                <button type="button" id="electronicsCrosswordFullscreen" class="electronics-crossword-icon-btn" data-action="crossword-fullscreen" aria-label="Open crossword fullscreen">⛶ Fullscreen</button>
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
                  <li>Click a square to select its word.</li>
                  <li>Click an intersection twice to switch direction.</li>
                  <li>Type letters to move forward automatically.</li>
                  <li>Use <strong>Space</strong> to switch Across / Down.</li>
                  <li>Use the arrow keys to move around the grid.</li>
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
  }

  function startElectronicsCrossword() {
    injectStyles();
    resetElectronicsCrossword();
    if (typeof window.go === 'function') window.go('explore-crossword');
  }

  function clearElectronicsCrossword() {
    if (!crosswordGameState) return;
    crosswordGameState.answers = {};
    crosswordGameState.answered = false;
    crosswordGameState.correct = 0;
    crosswordGameState.total = crosswordGameState.board.flat().filter(cell => cell.active).length;
    rerender();
  }

  async function exitElectronicsCrossword() {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (_) { /* ignore */ }
    }

    crosswordGameState = null;

    if (boardResizeObserver) {
      boardResizeObserver.disconnect();
      boardResizeObserver = null;
    }

    if (typeof window.go === 'function') window.go('explore');
  }

  document.addEventListener('click', event => {
    const actionTarget = event.target.closest('[data-action="crossword-fullscreen"], [data-action="crossword-howto"]');
    if (!actionTarget) return;

    if (actionTarget.dataset.action === 'crossword-fullscreen') {
      event.preventDefault();
      toggleCrosswordFullscreen();
    }

    if (actionTarget.dataset.action === 'crossword-howto') {
      event.preventDefault();
      toggleHowToPlay();
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
