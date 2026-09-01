/* ============================================================
   EcE Hub — Electronics Crossword · Level 2
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
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
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

  /*
   * Find another editable cell without using the ENTRIES array order.
   * The array is intentionally organized by board construction order, not
   * clue order, so the old implementation incorrectly sent #1 Down to #6.
   *
   * First stay inside the current word. If that word has just been locked,
   * continue to the next unsolved clue in numerical crossword order.
   */
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
    state.activeEntry = index;
    const cells = entryCells(index);
    const cell = preferredCell || cells.find(c => !state.locked.has(`${c.row}:${c.col}`)) || cells[0];
    state.selected = cell;
    state.errorEntry = null;
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
      if (next) state.selected = next;
    }
  }

  function validateEntry(index) {
    if (!entryIsComplete(index)) return false;

    const correct = entryWord(index) === ENTRIES[index].answer;
    if (correct) {
      lockEntry(index);
      state.errorEntry = null;
      state.message = `${ENTRIES[index].number} ${ENTRIES[index].direction === 'across' ? 'Across' : 'Down'} is correct and locked.`;

      /*
       * IMPORTANT: never jump according to the internal array position.
       * After #1 Down, for example, the next clue is #2 Across, not #6.
       */
      const next = nextEditableCell(index, -1);
      state.selected = next;
      return true;
    }

    state.errorEntry = index;
    state.message = `Not quite — check ${ENTRIES[index].number} ${ENTRIES[index].direction === 'across' ? 'Across' : 'Down'} and try again.`;
    return false;
  }

  function inputLetter(letter) {
    if (!state?.selected) selectEntry(state?.activeEntry || 0);
    if (!state?.selected) return;

    let cell = state.selected;
    if (state.locked.has(`${cell.row}:${cell.col}`)) {
      cell = nextEditableCell(
        state.activeEntry,
        entryCells(state.activeEntry).findIndex(c => c.row === cell.row && c.col === cell.col)
      );
      if (!cell) return;
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
        ) || next;
      }
      render();
    }
  }

  function clear() {
    if (!state) reset();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!state.locked.has(`${r}:${c}`)) state.values[r][c] = '';
    }
    state.errorEntry = null;
    state.message = 'Unlocked letters cleared. Correct words remain locked.';
    render();
  }

  function checkAll() {
    ENTRIES.forEach((_, i) => { if (entryIsComplete(i)) validateEntry(i); });
    render();
  }

  function fullscreen() {
    const el = document.querySelector('.electronics-crossword-level2');
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  function exit() {
    state = null;
    if (typeof window.go === 'function') window.go('explore');
  }

  function switchLevel1() {
    if (typeof window.ExploreGames?.startElectronicsCrossword === 'function') {
      window.ExploreGames.startElectronicsCrossword();
    }
  }

  function handleClick(event) {
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

  function installEvents() {
    if (installed) return;
    installed = true;
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown, true);
  }

  function injectStyles() {
    if (document.getElementById('ece-crossword-level2-styles')) return;
    const style = document.createElement('style');
    style.id = 'ece-crossword-level2-styles';
    style.textContent = `
      .electronics-crossword-level2 { width:100%; max-width:1440px; margin:0 auto; padding:28px 32px 48px; color:#12213b; font-family:inherit; }
      .electronics-crossword-level2 * { box-sizing:border-box; }
      .cw2-header { display:flex; gap:16px; align-items:flex-start; margin-bottom:22px; }
      .cw2-header h1 { margin:0; font-size:clamp(26px,2.5vw,36px); line-height:1.1; letter-spacing:-.035em; }
      .cw2-eyebrow { color:#718096; font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
      .cw2-header p { margin:8px 0 0; color:#64748b; font-size:15px; }
      .cw2-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,360px); gap:20px; align-items:start; }
      .cw2-card { min-width:0; background:#fff; border:1px solid rgba(148,163,184,.28); border-radius:20px; box-shadow:0 12px 34px rgba(15,23,42,.07); }
      .cw2-board-card { padding:20px; }
      .cw2-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
      .cw2-tools { display:flex; align-items:center; gap:8px; }
      .cw2-tools button,.cw2-actions button,.cw2-header button { border:1px solid #dbe3ef; border-radius:9px; background:#fff; color:#12213b; min-height:38px; padding:8px 13px; font:inherit; font-size:13px; font-weight:750; cursor:pointer; }
      .cw2-tools button:hover,.cw2-actions button:hover,.cw2-header button:hover { background:#f7f8fc; }
      .cw2-tools .primary,.cw2-actions .primary { background:#5b4be8; color:#fff; border-color:#5b4be8; }
      .cw2-board-shell { width:100%; aspect-ratio:1/1; min-height:300px; display:flex; align-items:center; justify-content:center; padding:8px; overflow:hidden; background:#f7f9fd; border:1px solid #edf1f7; border-radius:14px; }
      .cw2-board { width:min(100%,620px); aspect-ratio:1/1; display:grid; grid-template-columns:repeat(17,minmax(0,1fr)); grid-template-rows:repeat(17,minmax(0,1fr)); gap:1px; padding:2px; background:#18243d; border:2px solid #18243d; border-radius:8px; overflow:hidden; user-select:none; touch-action:manipulation; }
      .cw2-block,.cw2-cell { min-width:0; min-height:0; }
      .cw2-block { background:#18243d; }
      .cw2-cell { position:relative; display:flex; align-items:center; justify-content:center; border:0; padding:0; background:#fff; color:#12213b; font-size:clamp(9px,1.6vw,18px); font-weight:850; cursor:pointer; }
      .cw2-cell:hover { background:#f0f2ff; }
      .cw2-cell.word-selected { background:#eae8ff; }
      .cw2-cell.selected { background:#5b4be8; color:#fff; box-shadow:inset 0 0 0 2px #4637d5; z-index:2; }
      .cw2-cell.locked { background:#dcfce7; color:#166534; cursor:default; }
      .cw2-cell.locked::after { content:'✓'; position:absolute; right:2px; bottom:1px; font-size:clamp(6px,1vw,10px); color:#22a05a; }
      .cw2-cell.selected.locked { background:#b9edcf; color:#14532d; box-shadow:inset 0 0 0 2px #22a05a; }
      .cw2-cell.error { background:#fee2e2; color:#b91c1c; animation:cw2wiggle .42s ease; }
      @keyframes cw2wiggle { 0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)} }
      .cw2-num { position:absolute; top:2px; left:3px; font-size:clamp(5px,.7vw,9px); line-height:1; color:#64748b; }
      .cw2-cell.selected .cw2-num { color:#fff; }
      .cw2-cell.locked .cw2-num { color:#32805a; }
      .cw2-letter { pointer-events:none; }
      .cw2-status { min-height:52px; margin-top:14px; padding:11px 14px; display:flex; align-items:center; justify-content:space-between; gap:16px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; }
      .cw2-status strong { font-size:14px; }.cw2-status span { color:#64748b; font-size:12px; text-align:right; }
      .cw2-actions { display:flex; flex-wrap:wrap; gap:9px; margin-top:12px; }
      .cw2-side { display:flex; flex-direction:column; gap:14px; min-width:0; }
      .cw2-howto,.cw2-clues { padding:18px; }
      .cw2-howto h2,.cw2-clues h2 { margin:0 0 10px; font-size:16px; }
      .cw2-howto p,.cw2-howto li { color:#64748b; font-size:13px; line-height:1.65; }.cw2-howto ul{margin:10px 0 0;padding-left:18px;}
      .cw2-clues { max-height:calc(100vh - 180px); overflow:auto; overscroll-behavior:contain; }
      .cw2-section + .cw2-section { margin-top:22px; padding-top:20px; border-top:1px solid #edf1f7; }
      .cw2-section h3 { margin:0 0 9px; color:#18aeea; font-size:16px; letter-spacing:.1em; text-transform:uppercase; }
      .cw2-clue { width:100%; display:grid; grid-template-columns:34px minmax(0,1fr); gap:7px; align-items:start; padding:9px 8px; border:0; border-radius:10px; background:transparent; color:#24324a; font:inherit; text-align:left; cursor:pointer; }
      .cw2-clue:hover { background:#f6f7fb; }.cw2-clue.active{background:#eeecff;box-shadow:inset 3px 0 #18aeea}.cw2-clue.completed{background:#effaf3}.cw2-clue.completed .cw2-clue-num{color:#16a05a}.cw2-clue-num{color:#18aeea;font-weight:850}.cw2-clue-text{color:#64748b;line-height:1.45}
      @media(max-width:900px){.cw2-layout{grid-template-columns:1fr}.cw2-clues{max-height:420px}.cw2-board-shell{min-height:0}.electronics-crossword-level2{padding:20px 16px 40px}}
      @media(max-width:520px){.cw2-header{flex-direction:column}.cw2-board-card{padding:12px}.cw2-tools span{display:none}.cw2-board-shell{padding:4px}}
      .electronics-crossword-level2:fullscreen{background:#f8fafc; overflow:auto; padding:28px;}
    `;
    document.head.appendChild(style);
  }

  function renderBoard() {
    const host = document.getElementById('electronicsCrosswordLevel2Board');
    if (!host || !state) return;
    host.innerHTML = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = state.board[r][c];
      const button = document.createElement('button');
      if (!cell) { button.className='cw2-block'; button.tabIndex=-1; host.appendChild(button); continue; }
      const key=`${r}:${c}`;
      const selected=state.selected?.row===r && state.selected?.col===c;
      const active=cell.entryIndexes.includes(state.activeEntry);
      const locked=state.locked.has(key);
      const error=state.errorEntry !== null && entryCells(state.errorEntry).some(x=>x.row===r&&x.col===c);
      button.type='button'; button.className=`cw2-cell${active?' word-selected':''}${selected?' selected':''}${locked?' locked':''}${error?' error':''}`;
      button.dataset.cw2Cell='1'; button.dataset.row=r; button.dataset.col=c;
      const n=state.starts.get(`${r}:${c}`);
      button.innerHTML=`${n?`<span class="cw2-num">${n}</span>`:''}<span class="cw2-letter">${esc(state.values[r][c])}</span>`;
      host.appendChild(button);
    }
  }

  function renderClues() {
    const across=document.getElementById('electronicsCrosswordLevel2Across');
    const down=document.getElementById('electronicsCrosswordLevel2Down');
    if(!across||!down||!state)return;
    const make=(entry,index)=>`<button type="button" class="cw2-clue${state.activeEntry===index?' active':''}${state.completed.has(index)?' completed':''}" data-cw2-entry="${index}"><span class="cw2-clue-num">${entry.number}.</span><span class="cw2-clue-text">${esc(entry.clue)}</span></button>`;
    across.innerHTML=ENTRIES.filter((e)=>e.direction==='across').map(e=>make(e,ENTRIES.indexOf(e))).join('');
    down.innerHTML=ENTRIES.filter((e)=>e.direction==='down').map(e=>make(e,ENTRIES.indexOf(e))).join('');
  }

  function render() {
    injectStyles(); installEvents();
    if (!state) reset();
    const root=document.getElementById('electronicsCrosswordLevel2Root');
    if (!root) return;
    const locked=state.completed.size;
    root.querySelector('.cw2-count').textContent=`${locked} / ${ENTRIES.length} words locked`;
    root.querySelector('.cw2-message').textContent=state.message;
    renderBoard(); renderClues();
    if(state.errorEntry!==null){
      setTimeout(()=>{ if(state?.errorEntry!==null){state.errorEntry=null;render();} },480);
    }
  }

  function view() {
    injectStyles(); installEvents();
    if (!state) reset();
    return `<section class="electronics-crossword-level2" id="electronicsCrosswordLevel2Root">
      <div class="cw2-header">
        <button type="button" data-cw2-action="exit">← Exit</button>
        <div><span class="cw2-eyebrow">ELECTRONICS · GAME · LEVEL 2</span><h1>Electronics Technicalities</h1><p>Advanced electronics terminology — a harder crossword set.</p></div>
      </div>
      <div class="cw2-layout">
        <section class="cw2-card cw2-board-card">
          <div class="cw2-heading"><strong>Crossword · Level 2</strong><div class="cw2-tools"><span>13 clues</span><button type="button" data-cw2-action="level1">Level 1</button><button type="button" data-cw2-action="fullscreen">⛶ Fullscreen</button></div></div>
          <div class="cw2-board-shell"><div class="cw2-board" id="electronicsCrosswordLevel2Board"></div></div>
          <div class="cw2-status"><strong class="cw2-count">0 / 13 words locked</strong><span class="cw2-message">${esc(state.message)}</span></div>
          <div class="cw2-actions"><button type="button" data-cw2-action="clear">Clear unlocked</button><button type="button" class="primary" data-cw2-action="check">Check Answers</button></div>
        </section>
        <aside class="cw2-side">
          <section class="cw2-card cw2-howto"><h2>🧩 How to play</h2><p>Complete the entire word before it is checked. Correct words turn green and lock permanently. Locked letters cannot be edited, even when the same cell is part of another direction.</p><ul><li>Type letters to move automatically.</li><li>Finish a word to validate it.</li><li>Wrong completed words wiggle and stay editable.</li><li>Click an intersection or press Space to switch direction.</li><li>Use Fullscreen when you need a larger board.</li></ul></section>
          <section class="cw2-card cw2-clues"><div class="cw2-section"><h3>Across</h3><div id="electronicsCrosswordLevel2Across"></div></div><div class="cw2-section"><h3>Down</h3><div id="electronicsCrosswordLevel2Down"></div></div></section>
        </aside>
      </div>
    </section>`;
  }

  function start() {
    injectStyles(); installEvents(); reset();
    if (typeof window.go === 'function') window.go('explore-crossword');
    setTimeout(()=>render(),0);
  }

  window.ExploreGames = window.ExploreGames || {};
  window.ExploreGames.electronicsCrosswordLevel2View = view;
  window.ExploreGames.startElectronicsCrosswordLevel2 = start;
  window.ExploreGames.submitElectronicsCrosswordLevel2 = checkAll;
  window.ExploreGames.clearElectronicsCrosswordLevel2 = clear;
  window.ExploreGames.exitElectronicsCrosswordLevel2 = exit;
})();
