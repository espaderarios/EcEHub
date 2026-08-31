/* ============================================================
   EcE Hub — Electronics Crossword
   ============================================================
   Standalone crossword game for the Explore view.

   This file owns the crossword state, layout, interaction and UI.
   app.js only needs to route to:
     - electronicsCrosswordView()
     - startElectronicsCrossword()
     - submitElectronicsCrossword()
     - clearElectronicsCrossword()
     - exitElectronicsCrossword()
   ============================================================ */

(function () {
  'use strict';

  const CROSSWORD_CHALLENGES = [
    {
      id: 1,
      title: 'Electronics Technicalities',
      instruction: 'Fill the crossword with the electronics terms described by the clues.',
      words: [
        { number: 1, answer: 'RESISTOR', clue: 'A component that opposes the flow of electric current.' },
        { number: 2, answer: 'DIODE', clue: 'A semiconductor device that primarily allows current to flow in one direction.' },
        { number: 3, answer: 'CAPACITOR', clue: 'A component that stores electrical charge.' },
        { number: 4, answer: 'VOLTAGE', clue: 'The electrical potential difference between two points.' },
        { number: 5, answer: 'CURRENT', clue: 'The flow of electric charge through a circuit.' },
        { number: 6, answer: 'TRANSISTOR', clue: 'A semiconductor device commonly used for switching and amplification.' },
        { number: 7, answer: 'OHM', clue: 'The SI unit of electrical resistance.' },
        { number: 8, answer: 'INDUCTOR', clue: 'A component that stores energy in a magnetic field.' },
        { number: 9, answer: 'VOLT', clue: 'The SI unit of electric potential difference.' },
        { number: 10, answer: 'WATT', clue: 'The SI unit of electrical power.' }
      ]
    }
  ];

  const GRID_SIZE = 17;
  let crosswordGameState = null;

  function normalizeAnswer(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z]/g, '');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cellKey(row, col) {
    return `${row}-${col}`;
  }

  function getCells(entry) {
    return Array.from({ length: entry.answer.length }, (_, i) => ({
      row: entry.row + (entry.direction === 'down' ? i : 0),
      col: entry.col + (entry.direction === 'across' ? i : 0)
    }));
  }

  function canPlace(word, row, col, direction, occupied) {
    const cells = Array.from({ length: word.length }, (_, i) => ({
      row: row + (direction === 'down' ? i : 0),
      col: col + (direction === 'across' ? i : 0)
    }));

    if (cells.some(c => c.row < 0 || c.row >= GRID_SIZE || c.col < 0 || c.col >= GRID_SIZE)) return null;

    const proposed = new Set(cells.map(c => cellKey(c.row, c.col)));
    let intersections = 0;

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const existing = occupied.get(cellKey(c.row, c.col));
      if (existing && existing !== word[i]) return null;
      if (existing) intersections++;
    }

    if (occupied.size && intersections === 0) return null;

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const isIntersection = occupied.has(cellKey(c.row, c.col));
      if (isIntersection) continue;

      const neighbors = [
        [c.row - 1, c.col], [c.row + 1, c.col],
        [c.row, c.col - 1], [c.row, c.col + 1]
      ];

      if (neighbors.some(([r, col]) => occupied.has(cellKey(r, col)) && !proposed.has(cellKey(r, col)))) return null;
    }

    if (direction === 'across') {
      if (occupied.has(cellKey(row, col - 1)) || occupied.has(cellKey(row, col + word.length))) return null;
    } else {
      if (occupied.has(cellKey(row - 1, col)) || occupied.has(cellKey(row + word.length, col))) return null;
    }

    return { cells, intersections };
  }

  function buildLayout(challenge) {
    const words = challenge.words.map(word => ({ ...word, answer: normalizeAnswer(word.answer) }));
    const occupied = new Map();
    const placed = [];

    const first = words[0];
    first.row = Math.floor(GRID_SIZE / 2);
    first.col = Math.floor((GRID_SIZE - first.answer.length) / 2);
    first.direction = 'across';
    placed.push(first);
    getCells(first).forEach((c, i) => occupied.set(cellKey(c.row, c.col), first.answer[i]));

    for (let wi = 1; wi < words.length; wi++) {
      const word = words[wi];
      const candidates = [];

      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          for (const direction of ['across', 'down']) {
            const result = canPlace(word.answer, row, col, direction, occupied);
            if (!result) continue;
            candidates.push({
              row, col, direction,
              intersections: result.intersections,
              distance: Math.abs(row - 8) + Math.abs(col - 8)
            });
          }
        }
      }

      candidates.sort((a, b) =>
        (b.intersections * 100 - b.distance) - (a.intersections * 100 - a.distance)
      );

      const choice = candidates[0];
      if (!choice) continue;

      word.row = choice.row;
      word.col = choice.col;
      word.direction = choice.direction;
      placed.push(word);
      getCells(word).forEach((c, i) => occupied.set(cellKey(c.row, c.col), word.answer[i]));
    }

    return placed;
  }

  function resetElectronicsCrossword() {
    const challenge = CROSSWORD_CHALLENGES[0];
    const entries = buildLayout(challenge);
    const board = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => ({ active: false, number: null, entries: [] }))
    );

    entries.forEach(entry => {
      getCells(entry).forEach((c, index) => {
        const cell = board[c.row][c.col];
        cell.active = true;
        if (!cell.entries.includes(entry.number)) cell.entries.push(entry.number);
        if (index === 0 && cell.number == null) cell.number = entry.number;
      });
    });

    crosswordGameState = {
      challenge: { ...challenge, entries },
      board,
      answers: {},
      selected: entries[0] ? { row: entries[0].row, col: entries[0].col } : null,
      direction: entries[0]?.direction || 'across',
      answered: false,
      correct: 0,
      total: board.flat().filter(cell => cell.active).length
    };
  }

  function findEntryAtCell(row, col, direction) {
    return crosswordGameState?.challenge.entries.find(entry =>
      entry.direction === direction && getCells(entry).some(c => c.row === row && c.col === col)
    ) || null;
  }

  function selectCell(row, col) {
    if (!crosswordGameState?.board[row]?.[col]?.active) return;
    const cell = crosswordGameState.board[row][col];

    if (crosswordGameState.selected?.row === row && crosswordGameState.selected?.col === col && cell.entries.length > 1) {
      const opposite = crosswordGameState.direction === 'across' ? 'down' : 'across';
      if (findEntryAtCell(row, col, opposite)) crosswordGameState.direction = opposite;
    } else if (!findEntryAtCell(row, col, crosswordGameState.direction)) {
      crosswordGameState.direction = cell.entries.length > 1 ? 'across' : (findEntryAtCell(row, col, 'across') ? 'across' : 'down');
    }

    crosswordGameState.selected = { row, col };
    rerender();
  }

  function selectEntry(entry) {
    crosswordGameState.direction = entry.direction;
    crosswordGameState.selected = { row: entry.row, col: entry.col };
    rerender();
  }

  function moveWithinWord(step) {
    if (!crosswordGameState?.selected) return;
    const { row, col } = crosswordGameState.selected;
    const entry = findEntryAtCell(row, col, crosswordGameState.direction);
    if (!entry) return;
    const cells = getCells(entry);
    const index = cells.findIndex(c => c.row === row && c.col === col);
    if (index < 0) return;
    const next = cells[Math.max(0, Math.min(cells.length - 1, index + step))];
    crosswordGameState.selected = { row: next.row, col: next.col };
  }

  function enterLetter(letter) {
    if (!crosswordGameState) return;
    if (!crosswordGameState.selected) {
      const first = crosswordGameState.challenge.entries[0];
      if (!first) return;
      crosswordGameState.selected = { row: first.row, col: first.col };
      crosswordGameState.direction = first.direction;
    }

    const value = normalizeAnswer(letter).charAt(0);
    if (!value) return;
    const { row, col } = crosswordGameState.selected;
    crosswordGameState.answers[cellKey(row, col)] = value;
    crosswordGameState.answered = false;
    moveWithinWord(1);
    rerender();
  }

  function deleteLetter() {
    if (!crosswordGameState?.selected) return;
    const { row, col } = crosswordGameState.selected;
    const key = cellKey(row, col);
    if (crosswordGameState.answers[key]) {
      delete crosswordGameState.answers[key];
    } else {
      moveWithinWord(-1);
      if (crosswordGameState.selected) delete crosswordGameState.answers[cellKey(crosswordGameState.selected.row, crosswordGameState.selected.col)];
    }
    crosswordGameState.answered = false;
    rerender();
  }

  function moveDirection(rowChange, colChange) {
    if (!crosswordGameState?.selected) return;
    let row = crosswordGameState.selected.row + rowChange;
    let col = crosswordGameState.selected.col + colChange;
    while (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      if (crosswordGameState.board[row][col].active) {
        crosswordGameState.selected = { row, col };
        const cell = crosswordGameState.board[row][col];
        if (rowChange && cell.entries.length) crosswordGameState.direction = findEntryAtCell(row, col, 'down') ? 'down' : crosswordGameState.direction;
        if (colChange && cell.entries.length) crosswordGameState.direction = findEntryAtCell(row, col, 'across') ? 'across' : crosswordGameState.direction;
        rerender();
        return;
      }
      row += rowChange;
      col += colChange;
    }
  }

  function toggleDirection() {
    if (!crosswordGameState?.selected) return;
    const { row, col } = crosswordGameState.selected;
    const opposite = crosswordGameState.direction === 'across' ? 'down' : 'across';
    if (findEntryAtCell(row, col, opposite)) {
      crosswordGameState.direction = opposite;
      rerender();
    }
  }

  function submitElectronicsCrossword() {
    if (!crosswordGameState) return;
    let correct = 0;
    const activeCells = crosswordGameState.board.flatMap((row, r) => row.map((cell, c) => cell.active ? { cell, r, c } : null)).filter(Boolean);

    activeCells.forEach(({ r, c }) => {
      const expected = crosswordGameState.challenge.entries.find(entry => getCells(entry).some(pos => pos.row === r && pos.col === c));
      const index = expected ? getCells(expected).findIndex(pos => pos.row === r && pos.col === c) : -1;
      const value = crosswordGameState.answers[cellKey(r, c)] || '';
      if (expected && index >= 0 && value === expected.answer[index]) correct++;
    });

    crosswordGameState.correct = correct;
    crosswordGameState.total = activeCells.length;
    crosswordGameState.answered = true;
    rerender();

    if (typeof window.toast === 'function') {
      window.toast(correct === activeCells.length ? '🎉 Crossword complete!' : `${correct} of ${activeCells.length} letters correct`);
    }
  }

  function clearElectronicsCrossword() {
    if (!crosswordGameState) return;
    crosswordGameState.answers = {};
    crosswordGameState.correct = 0;
    crosswordGameState.answered = false;
    crosswordGameState.selected = crosswordGameState.challenge.entries[0] ? {
      row: crosswordGameState.challenge.entries[0].row,
      col: crosswordGameState.challenge.entries[0].col
    } : null;
    crosswordGameState.direction = 'across';
    rerender();
  }

  function revealElectronicsCrossword() {
    if (!crosswordGameState) return;
    crosswordGameState.challenge.entries.forEach(entry => {
      getCells(entry).forEach((c, i) => {
        crosswordGameState.answers[cellKey(c.row, c.col)] = entry.answer[i];
      });
    });
    crosswordGameState.correct = crosswordGameState.total;
    crosswordGameState.answered = true;
    rerender();
  }

  function restartElectronicsCrossword() {
    resetElectronicsCrossword();
    rerender();
  }

  function nextElectronicsCrossword() {
    resetElectronicsCrossword();
    rerender();
  }

  function exitElectronicsCrossword() {
    crosswordGameState = null;
    if (typeof window.go === 'function') window.go('explore');
  }

  function startElectronicsCrossword() {
    resetElectronicsCrossword();
    if (typeof window.go === 'function') window.go('explore-crossword');
  }

  function getCellClass(row, col) {
    const state = crosswordGameState;
    const cell = state.board[row][col];
    if (!cell.active) return 'electronics-crossword-block';

    const classes = ['electronics-crossword-cell'];
    const selected = state.selected;
    const entry = selected ? findEntryAtCell(selected.row, selected.col, state.direction) : null;

    if (entry && getCells(entry).some(c => c.row === row && c.col === col)) classes.push('word-selected');
    if (selected?.row === row && selected?.col === col) classes.push('selected');

    if (state.answered) {
      const expectedEntry = state.challenge.entries.find(e => getCells(e).some(c => c.row === row && c.col === col));
      if (expectedEntry) {
        const index = getCells(expectedEntry).findIndex(c => c.row === row && c.col === col);
        const value = state.answers[cellKey(row, col)] || '';
        if (value) classes.push(value === expectedEntry.answer[index] ? 'correct' : 'incorrect');
      }
    }

    return classes.join(' ');
  }

  function renderBoardHtml() {
    const state = crosswordGameState;
    let html = '';
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = state.board[row][col];
        if (!cell.active) {
          html += '<div class="electronics-crossword-block" aria-hidden="true"></div>';
          continue;
        }
        const key = cellKey(row, col);
        html += `
          <button type="button" class="${getCellClass(row, col)}" data-crossword-cell="1" data-row="${row}" data-col="${col}" aria-label="Crossword cell ${row + 1}, ${col + 1}">
            ${cell.number ? `<span class="electronics-crossword-number">${cell.number}</span>` : ''}
            <span class="electronics-crossword-letter">${escapeHtml(state.answers[key] || '')}</span>
          </button>`;
      }
    }
    return html;
  }

  function renderCluesHtml(direction) {
    return crosswordGameState.challenge.entries
      .filter(entry => entry.direction === direction)
      .sort((a, b) => a.number - b.number)
      .map(entry => `
        <button type="button" class="electronics-crossword-clue ${crosswordGameState.selected && findEntryAtCell(crosswordGameState.selected.row, crosswordGameState.selected.col, crosswordGameState.direction)?.number === entry.number && crosswordGameState.direction === direction ? 'active' : ''}" data-crossword-clue="1" data-number="${entry.number}" data-direction="${entry.direction}">
          <span class="electronics-crossword-clue-number">${entry.number}</span>
          <span class="electronics-crossword-clue-text">${escapeHtml(entry.clue)}</span>
        </button>`)
      .join('');
  }

  function injectStyles() {
    if (document.getElementById('electronics-crossword-styles')) return;
    const style = document.createElement('style');
    style.id = 'electronics-crossword-styles';
    style.textContent = `
      .electronics-crossword-page{max-width:1280px;margin:0 auto;padding:34px 40px 56px;color:var(--text,#101d36)}
      .electronics-crossword-top{display:flex;align-items:center;gap:22px;margin-bottom:28px}
      .electronics-crossword-back{flex:0 0 auto}
      .electronics-crossword-eyebrow{display:block;font-size:12px;font-weight:800;letter-spacing:.12em;color:#66758d;margin-bottom:7px}
      .electronics-crossword-title{font-size:clamp(28px,3vw,42px);line-height:1.08;margin:0 0 9px;letter-spacing:-.035em}
      .electronics-crossword-subtitle{margin:0;color:#64738a;font-size:16px}
      .electronics-crossword-layout{display:grid;grid-template-columns:minmax(460px,1fr) minmax(320px,420px);gap:28px;align-items:start}
      .electronics-crossword-card,.electronics-crossword-clue-card{background:var(--card,#fff);border:1px solid rgba(16,29,54,.09);border-radius:20px;box-shadow:0 12px 36px rgba(16,29,54,.07)}
      .electronics-crossword-card{padding:24px}
      .electronics-crossword-board-wrap{display:flex;justify-content:center;overflow:auto;padding:4px}
      .electronics-crossword-board{display:grid;grid-template-columns:repeat(17,minmax(24px,36px));grid-template-rows:repeat(17,minmax(24px,36px));gap:2px;width:max-content;background:#dce2eb;padding:2px;border-radius:10px}
      .electronics-crossword-block{background:#101d36;border-radius:2px}
      .electronics-crossword-cell{position:relative;border:0;background:#fff;padding:0;border-radius:2px;cursor:pointer;font:inherit;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .12s}
      .electronics-crossword-cell:hover{background:#eef0ff}
      .electronics-crossword-cell.word-selected{background:#e9e7ff}
      .electronics-crossword-cell.selected{background:#5b4cf0;color:#fff;box-shadow:inset 0 0 0 2px #4939dc;z-index:2}
      .electronics-crossword-cell.correct{background:#dff7e8;color:#17683a}
      .electronics-crossword-cell.incorrect{background:#ffe4e4;color:#9c2525}
      .electronics-crossword-cell.selected .electronics-crossword-letter{color:#fff}
      .electronics-crossword-number{position:absolute;top:2px;left:3px;font-size:8px;line-height:1;font-weight:800;color:#5d6c83}
      .electronics-crossword-cell.selected .electronics-crossword-number{color:rgba(255,255,255,.82)}
      .electronics-crossword-letter{font-size:clamp(14px,1.7vw,21px);font-weight:800;line-height:1;text-transform:uppercase}
      .electronics-crossword-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:20px;padding-top:18px;border-top:1px solid rgba(16,29,54,.08)}
      .electronics-crossword-progress strong{display:block;font-size:16px}.electronics-crossword-progress span{display:block;color:#728097;font-size:12px;margin-top:3px}
      .electronics-crossword-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
      .electronics-crossword-actions .btn{min-height:40px}
      .electronics-crossword-clue-card{padding:22px;max-height:calc(100vh - 170px);overflow:auto}
      .electronics-crossword-how{padding:15px 16px;border-radius:14px;background:#f6f7fb;margin-bottom:22px}
      .electronics-crossword-how strong{display:block;font-size:13px;margin-bottom:5px}.electronics-crossword-how p{margin:0;color:#68778e;font-size:13px;line-height:1.55}
      .electronics-crossword-clue-section+ .electronics-crossword-clue-section{margin-top:24px;padding-top:22px;border-top:1px solid rgba(16,29,54,.08)}
      .electronics-crossword-clue-section h2{font-size:13px;letter-spacing:.09em;text-transform:uppercase;margin:0 0 10px;color:#69788f}
      .electronics-crossword-clue-list{display:grid;gap:4px}
      .electronics-crossword-clue{display:grid;grid-template-columns:32px 1fr;text-align:left;gap:8px;width:100%;padding:10px 9px;border:0;background:transparent;border-radius:10px;cursor:pointer;color:inherit}
      .electronics-crossword-clue:hover{background:#f3f4f9}.electronics-crossword-clue.active{background:#ebe9ff}
      .electronics-crossword-clue-number{font-weight:850;color:#5b4cf0}.electronics-crossword-clue-text{font-size:13px;line-height:1.45;color:#526177}
      .electronics-crossword-clue.active .electronics-crossword-clue-text{color:#101d36;font-weight:650}
      .electronics-crossword-result{margin-top:16px;padding:14px 16px;border-radius:13px;background:#f6f7fb;font-size:13px}.electronics-crossword-result.success{background:#e4f8eb;color:#17683a}.electronics-crossword-result strong{display:block;font-size:15px;margin-bottom:3px}
      @media(max-width:900px){.electronics-crossword-page{padding:24px 18px 42px}.electronics-crossword-layout{grid-template-columns:1fr}.electronics-crossword-clue-card{max-height:none}.electronics-crossword-board{grid-template-columns:repeat(17,28px);grid-template-rows:repeat(17,28px)}}
      @media(max-width:560px){.electronics-crossword-top{align-items:flex-start;flex-direction:column;gap:14px}.electronics-crossword-card{padding:14px}.electronics-crossword-toolbar{align-items:flex-start;flex-direction:column}.electronics-crossword-actions{justify-content:flex-start}.electronics-crossword-board{grid-template-columns:repeat(17,24px);grid-template-rows:repeat(17,24px);gap:1px}.electronics-crossword-number{font-size:7px;top:1px;left:2px}.electronics-crossword-letter{font-size:14px}}
    `;
    document.head.appendChild(style);
  }

  function electronicsCrosswordView() {
    injectStyles();
    if (!crosswordGameState) resetElectronicsCrossword();
    const state = crosswordGameState;
    const complete = state.answered && state.correct === state.total && state.total > 0;
    const filled = Object.keys(state.answers).length;

    return `
      <section class="electronics-crossword-page">
        <header class="electronics-crossword-top">
          <button type="button" class="btn electronics-crossword-back" data-action="exit-electronics-crossword">← Back to Explore</button>
          <div>
            <span class="electronics-crossword-eyebrow">ELECTRONICS • GAME</span>
            <h1 class="electronics-crossword-title">${escapeHtml(state.challenge.title)}</h1>
            <p class="electronics-crossword-subtitle">A quick terminology challenge for EcE students.</p>
          </div>
        </header>

        <div class="electronics-crossword-layout">
          <section class="electronics-crossword-card">
            <div class="electronics-crossword-board-wrap">
              <div class="electronics-crossword-board" aria-label="Electronics crossword">
                ${renderBoardHtml()}
              </div>
            </div>

            <div class="electronics-crossword-toolbar">
              <div class="electronics-crossword-progress">
                <strong>${state.answered ? `${state.correct} / ${state.total} letters correct` : `${filled} / ${state.total} letters filled`}</strong>
                <span>${complete ? 'Perfect solve — every letter is correct.' : 'Click a cell, type a letter, and use Space to switch direction.'}</span>
              </div>
              <div class="electronics-crossword-actions">
                <button type="button" class="btn" data-action="crossword-clear">Clear</button>
                <button type="button" class="btn primary" data-action="crossword-submit">Check Answers</button>
              </div>
            </div>

            ${state.answered ? `<div class="electronics-crossword-result ${complete ? 'success' : ''}"><strong>${complete ? '🎉 Crossword Complete!' : 'Keep going!'}</strong>${complete ? 'You solved all of the electronics terms.' : 'Review the highlighted cells and try again.'}</div>` : ''}
          </section>

          <aside class="electronics-crossword-clue-card">
            <div class="electronics-crossword-how">
              <strong>How to play</strong>
              <p>${escapeHtml(state.challenge.instruction)} Click a clue to jump to its word. Press Space to switch Across/Down.</p>
            </div>

            <section class="electronics-crossword-clue-section">
              <h2>Across</h2>
              <div class="electronics-crossword-clue-list">${renderCluesHtml('across')}</div>
            </section>

            <section class="electronics-crossword-clue-section">
              <h2>Down</h2>
              <div class="electronics-crossword-clue-list">${renderCluesHtml('down')}</div>
            </section>
          </aside>
        </div>
      </section>
    `;
  }

  function rerender() {
    if (typeof window.render === 'function') window.render();
  }

  function handleKeyboard(event) {
    if (!document.querySelector('.electronics-crossword-page')) return;
    if (event.target?.matches?.('input, textarea, [contenteditable="true"]')) return;

    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      enterLetter(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      deleteLetter();
    } else if (event.key === ' ') {
      event.preventDefault();
      toggleDirection();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveDirection(0, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveDirection(0, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveDirection(1, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveDirection(-1, 0);
    }
  }

  document.addEventListener('keydown', handleKeyboard);

  document.addEventListener('click', event => {
    const cell = event.target.closest?.('[data-crossword-cell]');
    if (cell) {
      selectCell(Number(cell.dataset.row), Number(cell.dataset.col));
      return;
    }

    const clue = event.target.closest?.('[data-crossword-clue]');
    if (clue && crosswordGameState) {
      const entry = crosswordGameState.challenge.entries.find(item =>
        item.number === Number(clue.dataset.number) && item.direction === clue.dataset.direction
      );
      if (entry) selectEntry(entry);
    }
  });

  window.ExploreGames = window.ExploreGames || {};
  Object.assign(window.ExploreGames, {
    electronicsCrosswordView,
    startElectronicsCrossword,
    submitElectronicsCrossword,
    clearElectronicsCrossword,
    exitElectronicsCrossword,
    revealElectronicsCrossword,
    restartElectronicsCrossword,
    nextElectronicsCrossword
  });

  console.log('EcE Hub Electronics Crossword loaded');
})();
