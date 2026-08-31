/* ============================================================
   EcE Hub — Electronics Crossword
   ============================================================

   Classic crossword-style electronics game.

   Public API:
   - electronicsCrosswordView()
   - startElectronicsCrossword()
   - submitElectronicsCrossword()
   - clearElectronicsCrossword()
   - exitElectronicsCrossword()

   The crossword layout is intentionally explicit and validated:
   - every word is placed on the same grid
   - crossings share the same letter
   - same-direction words never overlap
   - black squares separate entries
   - clue numbering follows normal crossword numbering
   ============================================================ */

(function () {
  'use strict';

  const GRID_ROWS = 15;
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

  const CROSSWORD_CSS = `
    .electronics-crossword-page{width:100%;max-width:1280px;margin:0 auto;padding:32px 40px 56px;color:var(--text,#12213b)}
    .electronics-crossword-page,.electronics-crossword-page *{box-sizing:border-box}
    .electronics-crossword-header{display:flex;align-items:flex-start;gap:20px;margin-bottom:26px}
    .electronics-crossword-header .btn{flex:0 0 auto;margin-top:2px}
    .electronics-crossword-eyebrow{display:block;margin:2px 0 8px;color:#64748b;font-size:12px;font-weight:800;letter-spacing:.12em}
    .electronics-crossword-header h1{margin:0;color:#12213b;font-size:clamp(28px,3vw,38px);line-height:1.1;letter-spacing:-.035em}
    .electronics-crossword-header p{margin:9px 0 0;color:#64748b;font-size:16px}
    .electronics-crossword-layout{display:grid;grid-template-columns:minmax(540px,720px) minmax(320px,1fr);gap:24px;align-items:start}
    .electronics-crossword-card{background:var(--card,#fff);border:1px solid rgba(148,163,184,.25);border-radius:20px;box-shadow:0 12px 32px rgba(15,23,42,.06)}
    .electronics-crossword-board-card{padding:24px}
    .electronics-crossword-board-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .electronics-crossword-board-heading strong{font-size:17px}.electronics-crossword-board-heading span{color:#64748b;font-size:13px}
    .electronics-crossword-board-shell{display:flex;justify-content:center;width:100%;overflow-x:auto;padding:4px}
    .electronics-crossword-board{--crossword-cell-size:clamp(28px,4vw,42px);display:grid;grid-template-columns:repeat(15,var(--crossword-cell-size));grid-template-rows:repeat(15,var(--crossword-cell-size));width:max-content;height:max-content;gap:1px;padding:2px;background:#18243d;border:2px solid #18243d;border-radius:8px;overflow:hidden}
    .electronics-crossword-block{width:var(--crossword-cell-size);height:var(--crossword-cell-size);background:#18243d}
    .electronics-crossword-cell{position:relative;width:var(--crossword-cell-size);height:var(--crossword-cell-size);padding:0;display:flex;align-items:center;justify-content:center;border:0;border-radius:0;background:#fff;color:#12213b;cursor:pointer;user-select:none;font-family:inherit;font-size:clamp(14px,2vw,21px);font-weight:800;line-height:1;transition:background-color .12s ease,box-shadow .12s ease,color .12s ease}
    .electronics-crossword-cell:hover{background:#f1f3ff}.electronics-crossword-cell.word-selected{background:#e9e7ff}.electronics-crossword-cell.selected{z-index:2;background:#5b4be8;color:#fff;box-shadow:inset 0 0 0 2px #4435c8}.electronics-crossword-cell.correct{background:#dcfce7;color:#166534}.electronics-crossword-cell.incorrect{background:#fee2e2;color:#b91c1c}.electronics-crossword-cell.selected.correct,.electronics-crossword-cell.selected.incorrect{color:#fff}
    .electronics-crossword-number{position:absolute;top:3px;left:4px;color:#64748b;font-size:9px;font-weight:800;line-height:1;pointer-events:none}.electronics-crossword-cell.selected .electronics-crossword-number{color:rgba(255,255,255,.95)}
    .electronics-crossword-letter{margin-top:4px;pointer-events:none}
    .electronics-crossword-status{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:54px;margin-top:18px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.electronics-crossword-status strong{font-size:15px}.electronics-crossword-status span{color:#64748b;font-size:13px;text-align:right}.electronics-crossword-status.complete{border-color:#bbf7d0;background:#f0fdf4}
    .electronics-crossword-actions{display:flex;gap:10px;margin-top:14px}.electronics-crossword-actions .btn{min-width:125px}
    .electronics-crossword-side{display:flex;flex-direction:column;gap:16px}.electronics-crossword-instructions{padding:20px}.electronics-crossword-instruction-icon{width:40px;height:40px;display:grid;place-items:center;margin-bottom:12px;border-radius:11px;background:#eeecff;font-size:20px}.electronics-crossword-instructions h2{margin:0 0 8px;font-size:18px}.electronics-crossword-instructions p{margin:0;color:#64748b;font-size:14px;line-height:1.6}
    .electronics-crossword-clues{padding:20px}.electronics-crossword-clue-section+.electronics-crossword-clue-section{margin-top:24px}.electronics-crossword-clue-section h2{margin:0 0 10px;font-size:18px}
    .electronics-crossword-clue{width:100%;display:grid;grid-template-columns:34px 1fr;gap:8px;padding:9px 8px;border:0;border-radius:10px;background:transparent;color:#24324a;cursor:pointer;text-align:left;font:inherit}.electronics-crossword-clue:hover{background:#f1f5f9}.electronics-crossword-clue.active{background:#eeecff;color:#4033a7}.electronics-crossword-clue-number{font-weight:800}.electronics-crossword-clue-text{font-size:14px;line-height:1.45}
    @media(max-width:1050px){.electronics-crossword-layout{grid-template-columns:1fr}.electronics-crossword-board{--crossword-cell-size:clamp(28px,5vw,40px)}.electronics-crossword-side{display:grid;grid-template-columns:1fr 1fr;align-items:start}}
    @media(max-width:700px){.electronics-crossword-page{padding:22px 16px 40px}.electronics-crossword-header{flex-direction:column}.electronics-crossword-layout{gap:16px}.electronics-crossword-board-card{padding:14px}.electronics-crossword-board{--crossword-cell-size:27px}.electronics-crossword-side{display:flex}.electronics-crossword-status{align-items:flex-start;flex-direction:column}.electronics-crossword-status span{text-align:left}.electronics-crossword-actions{width:100%}.electronics-crossword-actions .btn{flex:1}}
  `;

  function injectStyles(){
    if(document.getElementById('electronics-crossword-styles'))return;
    const style=document.createElement('style');
    style.id='electronics-crossword-styles';
    style.textContent=CROSSWORD_CSS;
    document.head.appendChild(style);
  }

  function normalizeAnswer(value){return String(value||'').toUpperCase().replace(/[^A-Z]/g,'')}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
  function cellKey(row,col){return `${row}-${col}`}

  function getEntryCells(entry){
    const answer=normalizeAnswer(entry.answer);
    const cells=[];
    for(let i=0;i<answer.length;i++)cells.push({row:entry.row+(entry.direction==='down'?i:0),col:entry.col+(entry.direction==='across'?i:0)});
    return cells;
  }

  function isInside(row,col){return row>=0&&row<GRID_ROWS&&col>=0&&col<GRID_COLS}

  function createBoard(entries){
    const board=Array.from({length:GRID_ROWS},()=>Array.from({length:GRID_COLS},()=>({active:false,number:null,entries:[],expected:null})));

    entries.forEach(entry=>{
      const answer=normalizeAnswer(entry.answer);
      getEntryCells(entry).forEach((position,index)=>{
        if(!isInside(position.row,position.col))throw new Error(`Crossword entry "${answer}" is outside the grid.`);
        const cell=board[position.row][position.col];
        const expected=answer[index];
        if(cell.active&&cell.expected&&cell.expected!==expected)throw new Error(`Invalid crossword crossing at ${position.row},${position.col}.`);
        cell.active=true;
        cell.expected=expected;
        if(!cell.entries.includes(entry))cell.entries.push(entry);
      });
    });

    const starts=[];
    entries.forEach(entry=>{
      const first=getEntryCells(entry)[0];
      const previous={row:first.row+(entry.direction==='down'?-1:0),col:first.col+(entry.direction==='across'?-1:0)};
      if(!isInside(previous.row,previous.col)||!board[previous.row][previous.col].active)starts.push({row:first.row,col:first.col});
    });

    const uniqueStarts=Array.from(new Map(starts.map(start=>[cellKey(start.row,start.col),start])).values()).sort((a,b)=>a.row-b.row||a.col-b.col);
    uniqueStarts.forEach((start,index)=>{board[start.row][start.col].number=index+1});
    return board;
  }

  function validateLayout(entries,board){
    const occupied=new Map();
    entries.forEach(entry=>getEntryCells(entry).forEach((position,index)=>{
      const key=cellKey(position.row,position.col);
      const letter=normalizeAnswer(entry.answer)[index];
      if(!occupied.has(key))occupied.set(key,[]);
      occupied.get(key).push({direction:entry.direction,letter});
    }));

    for(const [key,uses] of occupied){
      const directions=new Set();
      uses.forEach(use=>{
        if(directions.has(use.direction))throw new Error(`Two ${use.direction} entries overlap at ${key}.`);
        directions.add(use.direction);
      });
      if(uses.length>1&&uses.some(use=>use.letter!==uses[0].letter))throw new Error(`Crossing letters do not match at ${key}.`);
    }

    entries.forEach(entry=>{
      const ownKeys=new Set(getEntryCells(entry).map(position=>cellKey(position.row,position.col)));
      getEntryCells(entry).forEach(position=>{
        const neighbors=entry.direction==='across'?[{row:position.row-1,col:position.col},{row:position.row+1,col:position.col}]:[{row:position.row,col:position.col-1},{row:position.row,col:position.col+1}];
        neighbors.forEach(neighbor=>{
          if(!isInside(neighbor.row,neighbor.col))return;
          const key=cellKey(neighbor.row,neighbor.col);
          if(board[neighbor.row][neighbor.col].active&&!ownKeys.has(key)){
            const crossingEntry=board[neighbor.row][neighbor.col].entries.find(other=>other.direction!==entry.direction);
            if(!crossingEntry)throw new Error(`Invalid adjacent crossword entries near ${key}.`);
          }
        });
      });
    });
  }

  function resetElectronicsCrossword(){
    const entries=CROSSWORD_ENTRIES.map(entry=>({...entry,answer:normalizeAnswer(entry.answer)}));
    const board=createBoard(entries);
    validateLayout(entries,board);
    const firstEntry=entries[0];
    crosswordGameState={challenge:{...CHALLENGE,entries},board,answers:{},selected:{row:firstEntry.row,col:firstEntry.col},direction:firstEntry.direction,answered:false,correct:0,total:board.flat().filter(cell=>cell.active).length};
  }

  function findEntryAtCell(row,col,direction){
    if(!crosswordGameState)return null;
    return crosswordGameState.challenge.entries.find(entry=>entry.direction===direction&&getEntryCells(entry).some(position=>position.row===row&&position.col===col))||null;
  }

  function getSelectedEntry(){
    if(!crosswordGameState?.selected)return null;
    return findEntryAtCell(crosswordGameState.selected.row,crosswordGameState.selected.col,crosswordGameState.direction);
  }

  function selectCell(row,col){
    if(!crosswordGameState)return;
    const cell=crosswordGameState.board[row]?.[col];
    if(!cell?.active)return;
    const sameCell=crosswordGameState.selected&&crosswordGameState.selected.row===row&&crosswordGameState.selected.col===col;
    if(sameCell&&cell.entries.length>1){
      const opposite=crosswordGameState.direction==='across'?'down':'across';
      if(findEntryAtCell(row,col,opposite))crosswordGameState.direction=opposite;
    }else if(!findEntryAtCell(row,col,crosswordGameState.direction)){
      crosswordGameState.direction=findEntryAtCell(row,col,'across')?'across':'down';
    }
    crosswordGameState.selected={row,col};
    rerender();
  }

  function selectEntry(entry){
    if(!entry||!crosswordGameState)return;
    crosswordGameState.direction=entry.direction;
    crosswordGameState.selected={row:entry.row,col:entry.col};
    rerender();
  }

  function moveWithinWord(step){
    if(!crosswordGameState?.selected)return;
    const entry=getSelectedEntry();
    if(!entry)return;
    const cells=getEntryCells(entry);
    const currentIndex=cells.findIndex(position=>position.row===crosswordGameState.selected.row&&position.col===crosswordGameState.selected.col);
    if(currentIndex<0)return;
    const next=cells[Math.max(0,Math.min(cells.length-1,currentIndex+step))];
    crosswordGameState.selected={row:next.row,col:next.col};
  }

  function moveArrow(rowChange,colChange){
    if(!crosswordGameState?.selected)return;
    let row=crosswordGameState.selected.row+rowChange;
    let col=crosswordGameState.selected.col+colChange;
    while(isInside(row,col)){
      if(crosswordGameState.board[row][col].active){
        crosswordGameState.selected={row,col};
        if(rowChange!==0&&findEntryAtCell(row,col,'down'))crosswordGameState.direction='down';
        if(colChange!==0&&findEntryAtCell(row,col,'across'))crosswordGameState.direction='across';
        rerender();
        return;
      }
      row+=rowChange;
      col+=colChange;
    }
  }

  function toggleDirection(){
    if(!crosswordGameState?.selected)return;
    const opposite=crosswordGameState.direction==='across'?'down':'across';
    const {row,col}=crosswordGameState.selected;
    if(findEntryAtCell(row,col,opposite)){
      crosswordGameState.direction=opposite;
      rerender();
    }
  }

  function enterLetter(letter){
    if(!crosswordGameState)return;
    const value=normalizeAnswer(letter).charAt(0);
    if(!value)return;
    if(!crosswordGameState.selected){
      const first=crosswordGameState.challenge.entries[0];
      crosswordGameState.selected={row:first.row,col:first.col};
      crosswordGameState.direction=first.direction;
    }
    const {row,col}=crosswordGameState.selected;
    crosswordGameState.answers[cellKey(row,col)]=value;
    crosswordGameState.answered=false;
    moveWithinWord(1);
    rerender();
  }

  function deleteLetter(){
    if(!crosswordGameState?.selected)return;
    const {row,col}=crosswordGameState.selected;
    const currentKey=cellKey(row,col);
    if(crosswordGameState.answers[currentKey]){
      delete crosswordGameState.answers[currentKey];
    }else{
      moveWithinWord(-1);
      if(crosswordGameState.selected)delete crosswordGameState.answers[cellKey(crosswordGameState.selected.row,crosswordGameState.selected.col)];
    }
    crosswordGameState.answered=false;
    rerender();
  }

  function submitElectronicsCrossword(){
    if(!crosswordGameState)return;
    let correct=0;
    for(let row=0;row<GRID_ROWS;row++){
      for(let col=0;col<GRID_COLS;col++){
        const cell=crosswordGameState.board[row][col];
        if(!cell.active)continue;
        const submitted=crosswordGameState.answers[cellKey(row,col)]||'';
        if(submitted===cell.expected)correct++;
      }
    }
    crosswordGameState.correct=correct;
    crosswordGameState.answered=true;
    rerender();
    if(typeof window.toast==='function')window.toast(correct===crosswordGameState.total?'🎉 Crossword complete!':`${correct} of ${crosswordGameState.total} letters correct`);
  }

  function clearElectronicsCrossword(){
    if(!crosswordGameState)return;
    crosswordGameState.answers={};
    crosswordGameState.correct=0;
    crosswordGameState.answered=false;
    const first=crosswordGameState.challenge.entries[0];
    crosswordGameState.selected={row:first.row,col:first.col};
    crosswordGameState.direction=first.direction;
    rerender();
  }

  function revealElectronicsCrossword(){
    if(!crosswordGameState)return;
    crosswordGameState.challenge.entries.forEach(entry=>getEntryCells(entry).forEach((position,index)=>{crosswordGameState.answers[cellKey(position.row,position.col)]=entry.answer[index]}));
    crosswordGameState.correct=crosswordGameState.total;
    crosswordGameState.answered=true;
    rerender();
  }

  function getCellClasses(row,col){
    const cell=crosswordGameState.board[row][col];
    if(!cell.active)return'electronics-crossword-block';
    const classes=['electronics-crossword-cell'];
    const selectedEntry=getSelectedEntry();
    if(selectedEntry&&getEntryCells(selectedEntry).some(position=>position.row===row&&position.col===col))classes.push('word-selected');
    if(crosswordGameState.selected&&crosswordGameState.selected.row===row&&crosswordGameState.selected.col===col)classes.push('selected');
    if(crosswordGameState.answered){
      const submitted=crosswordGameState.answers[cellKey(row,col)]||'';
      if(submitted)classes.push(submitted===cell.expected?'correct':'incorrect');
    }
    return classes.join(' ');
  }

  function renderCrosswordBoard(){
    const container=document.getElementById('electronicsCrosswordBoard');
    if(!container||!crosswordGameState)return;
    container.innerHTML='';
    for(let row=0;row<GRID_ROWS;row++){
      for(let col=0;col<GRID_COLS;col++){
        const cell=crosswordGameState.board[row][col];
        if(!cell.active){
          const block=document.createElement('div');
          block.className='electronics-crossword-block';
          block.setAttribute('aria-hidden','true');
          container.appendChild(block);
          continue;
        }
        const button=document.createElement('button');
        button.type='button';
        button.className=getCellClasses(row,col);
        button.dataset.row=row;
        button.dataset.col=col;
        button.dataset.crosswordCell='1';
        if(cell.number!=null){
          const number=document.createElement('span');
          number.className='electronics-crossword-number';
          number.textContent=cell.number;
          button.appendChild(number);
        }
        const letter=document.createElement('span');
        letter.className='electronics-crossword-letter';
        letter.textContent=crosswordGameState.answers[cellKey(row,col)]||'';
        button.appendChild(letter);
        container.appendChild(button);
      }
    }
  }

  function renderCrosswordClues(){
    const across=document.getElementById('electronicsCrosswordAcross');
    const down=document.getElementById('electronicsCrosswordDown');
    if(!across||!down||!crosswordGameState)return;
    across.innerHTML='';
    down.innerHTML='';
    const entries=[...crosswordGameState.challenge.entries].sort((a,b)=>{
      const ac=getEntryCells(a)[0];
      const bc=getEntryCells(b)[0];
      const an=crosswordGameState.board[ac.row][ac.col].number;
      const bn=crosswordGameState.board[bc.row][bc.col].number;
      return an-bn||a.direction.localeCompare(b.direction);
    });
    entries.forEach(entry=>{
      const first=getEntryCells(entry)[0];
      const number=crosswordGameState.board[first.row][first.col].number;
      const button=document.createElement('button');
      button.type='button';
      button.className='electronics-crossword-clue';
      const selected=crosswordGameState.direction===entry.direction&&crosswordGameState.selected&&getEntryCells(entry).some(position=>position.row===crosswordGameState.selected.row&&position.col===crosswordGameState.selected.col);
      if(selected)button.classList.add('active');
      button.dataset.crosswordClue='1';
      button.dataset.number=number;
      button.dataset.direction=entry.direction;
      const numberSpan=document.createElement('span');
      numberSpan.className='electronics-crossword-clue-number';
      numberSpan.textContent=`${number}.`;
      const clueSpan=document.createElement('span');
      clueSpan.className='electronics-crossword-clue-text';
      clueSpan.textContent=entry.clue;
      button.append(numberSpan,clueSpan);
      (entry.direction==='across'?across:down).appendChild(button);
    });
  }

  function updateCrosswordStatus(){
    const status=document.getElementById('electronicsCrosswordStatus');
    if(!status||!crosswordGameState)return;
    const complete=crosswordGameState.answered&&crosswordGameState.correct===crosswordGameState.total;
    status.classList.toggle('complete',complete);
    if(!crosswordGameState.answered){status.innerHTML='<strong>Ready to solve</strong><span>Fill the grid, then check your answers.</span>';return}
    if(complete){status.innerHTML='<strong>🎉 Crossword complete!</strong><span>You solved every electronics term.</span>';return}
    status.innerHTML=`<strong>${crosswordGameState.correct} / ${crosswordGameState.total} correct</strong><span>Incorrect letters are highlighted. Try again.</span>`;
  }

  function handleKeyboard(event){
    if(!document.getElementById('electronicsCrosswordBoard'))return;
    if(event.target&&(event.target.tagName==='INPUT'||event.target.tagName==='TEXTAREA'||event.target.isContentEditable))return;
    if(/^[a-zA-Z]$/.test(event.key)){event.preventDefault();enterLetter(event.key);return}
    if(event.key==='Backspace'){event.preventDefault();deleteLetter();return}
    if(event.key===' '){event.preventDefault();toggleDirection();return}
    if(event.key==='ArrowRight'){event.preventDefault();moveArrow(0,1);return}
    if(event.key==='ArrowLeft'){event.preventDefault();moveArrow(0,-1);return}
    if(event.key==='ArrowDown'){event.preventDefault();moveArrow(1,0);return}
    if(event.key==='ArrowUp'){event.preventDefault();moveArrow(-1,0)}
  }

  document.addEventListener('click',event=>{
    const cell=event.target.closest?.('[data-crossword-cell="1"]');
    if(cell){selectCell(Number(cell.dataset.row),Number(cell.dataset.col));return}
    const clue=event.target.closest?.('[data-crossword-clue="1"]');
    if(clue){
      const number=Number(clue.dataset.number);
      const direction=clue.dataset.direction;
      const entry=crosswordGameState?.challenge.entries.find(item=>{
        const first=getEntryCells(item)[0];
        return crosswordGameState.board[first.row][first.col].number===number&&item.direction===direction;
      });
      if(entry)selectEntry(entry);
    }
  });

  document.addEventListener('keydown',handleKeyboard);

  function electronicsCrosswordView(){
    injectStyles();
    if(!crosswordGameState)resetElectronicsCrossword();
    const challenge=crosswordGameState.challenge;
    const complete=crosswordGameState.answered&&crosswordGameState.correct===crosswordGameState.total;
    const markup=`
      <section class="electronics-crossword-page">
        <header class="electronics-crossword-header">
          <button type="button" class="btn" data-action="exit-electronics-crossword">← Exit</button>
          <div>
            <span class="electronics-crossword-eyebrow">ELECTRONICS • GAME</span>
            <h1>${escapeHtml(challenge.title)}</h1>
            <p>${escapeHtml(challenge.subtitle)}</p>
          </div>
        </header>
        <div class="electronics-crossword-layout">
          <section class="electronics-crossword-card electronics-crossword-board-card">
            <div class="electronics-crossword-board-heading"><strong>Crossword</strong><span>${crosswordGameState.total} squares</span></div>
            <div class="electronics-crossword-board-shell"><div id="electronicsCrosswordBoard" class="electronics-crossword-board" aria-label="Electronics crossword grid"></div></div>
            <div id="electronicsCrosswordStatus" class="electronics-crossword-status ${complete?'complete':''}">
              ${complete?'<strong>🎉 Crossword complete!</strong><span>You solved every electronics term.</span>':'<strong>Ready to solve</strong><span>Fill the grid, then check your answers.</span>'}
            </div>
            <div class="electronics-crossword-actions">
              <button type="button" class="btn" data-action="crossword-clear">Clear</button>
              <button type="button" class="btn primary" data-action="crossword-submit">Check Answers</button>
            </div>
          </section>
          <aside class="electronics-crossword-side">
            <section class="electronics-crossword-card electronics-crossword-instructions">
              <div class="electronics-crossword-instruction-icon">🧩</div>
              <h2>How to play</h2>
              <p>${escapeHtml(challenge.instruction)}</p>
            </section>
            <section class="electronics-crossword-card electronics-crossword-clues">
              <div class="electronics-crossword-clue-section"><h2>Across</h2><div id="electronicsCrosswordAcross"></div></div>
              <div class="electronics-crossword-clue-section"><h2>Down</h2><div id="electronicsCrosswordDown"></div></div>
            </section>
          </aside>
        </div>
      </section>
    `;
    requestAnimationFrame(()=>{renderCrosswordBoard();renderCrosswordClues();updateCrosswordStatus()});
    return markup;
  }

  function rerender(){
    injectStyles();
    if(typeof window.render==='function'){window.render();return}
    renderCrosswordBoard();
    renderCrosswordClues();
    updateCrosswordStatus();
  }

  function startElectronicsCrossword(){
    injectStyles();
    resetElectronicsCrossword();
    if(typeof window.go==='function')window.go('explore-crossword');
  }

  function exitElectronicsCrossword(){
    crosswordGameState=null;
    if(typeof window.go==='function')window.go('explore');
  }

  window.ExploreGames=window.ExploreGames||{};
  Object.assign(window.ExploreGames,{electronicsCrosswordView,startElectronicsCrossword,submitElectronicsCrossword,clearElectronicsCrossword,exitElectronicsCrossword,revealElectronicsCrossword});

  window.electronicsCrosswordView=electronicsCrosswordView;
  window.startElectronicsCrossword=startElectronicsCrossword;
  window.submitElectronicsCrossword=submitElectronicsCrossword;
  window.clearElectronicsCrossword=clearElectronicsCrossword;
  window.exitElectronicsCrossword=exitElectronicsCrossword;

  console.log('EcE Hub Electronics Crossword — true crossword version loaded');
})();
