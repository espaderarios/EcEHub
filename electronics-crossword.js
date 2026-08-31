/* ============================================================
   EcE Hub — Electronics Crossword
   ============================================================ */
(function () {
  'use strict';

  const GRID_SIZE = 21;
  const CHALLENGE = {
    title: 'Electronics Technicalities',
    subtitle: 'Test your knowledge of electronics technical terminology.',
    instruction: 'Fill in the crossword using the electronics terminology clues. Click a square to select a word, then type the letters. Click an intersection twice or press Space to switch between Across and Down.',
    entries: [
      {number:1,answer:'RESISTOR',clue:'A component that opposes the flow of electric current.',row:10,col:6,direction:'across'},
      {number:2,answer:'DIODE',clue:'A semiconductor device that primarily allows current to flow in one direction.',row:9,col:9,direction:'down'},
      {number:3,answer:'CAPACITOR',clue:'A component that stores electrical charge.',row:4,col:11,direction:'down'},
      {number:4,answer:'VOLTAGE',clue:'The electrical potential difference between two points.',row:7,col:7,direction:'across'},
      {number:5,answer:'CURRENT',clue:'The flow of electric charge through a circuit.',row:8,col:6,direction:'down'},
      {number:6,answer:'TRANSISTOR',clue:'A semiconductor device commonly used for switching and amplification.',row:9,col:13,direction:'down'},
      {number:7,answer:'OHM',clue:'The SI unit of electrical resistance.',row:17,col:13,direction:'across'},
      {number:8,answer:'INDUCTOR',clue:'A component that stores energy in a magnetic field.',row:14,col:13,direction:'across'},
      {number:9,answer:'VOLT',clue:'The SI unit of electric potential difference.',row:16,col:10,direction:'across'},
      {number:10,answer:'WATT',clue:'The SI unit of electrical power.',row:5,col:10,direction:'across'}
    ]
  };

  let state = null;

  const CROSSWORD_CSS = `
    .electronics-crossword-page{width:100%;max-width:1320px;margin:0 auto;padding:34px 42px 60px;box-sizing:border-box;color:var(--text,#10203a)}
    .electronics-crossword-page *{box-sizing:border-box}
    .electronics-crossword-header{display:flex;gap:22px;align-items:flex-start;margin-bottom:24px}
    .electronics-crossword-header .btn{flex:0 0 auto}
    .electronics-crossword-eyebrow{display:block;font-size:12px;font-weight:800;letter-spacing:.12em;color:#64748b;margin:2px 0 8px}
    .electronics-crossword-header h1{margin:0;font-size:34px;line-height:1.12;letter-spacing:-.03em}
    .electronics-crossword-header p{margin:10px 0 0;color:#64748b;font-size:16px}
    .electronics-crossword-layout{display:grid;grid-template-columns:minmax(520px,700px) minmax(330px,1fr);gap:24px;align-items:start}
    .electronics-crossword-card{background:var(--card,#fff);border:1px solid rgba(148,163,184,.25);border-radius:20px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
    .electronics-crossword-board-card{padding:24px}
    .electronics-crossword-board-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
    .electronics-crossword-board-title strong{font-size:16px}.electronics-crossword-board-title span{font-size:13px;color:#64748b}
    .electronics-crossword-board{display:grid;grid-template-columns:repeat(21,minmax(18px,1fr));width:min(100%,650px);aspect-ratio:1;margin:0 auto;border:2px solid #17233d;background:#17233d;gap:1px;overflow:hidden}
    .electronics-crossword-cell,.electronics-crossword-block{min-width:0;min-height:0;position:relative;border:0;border-radius:0}
    .electronics-crossword-block{background:#17233d}.electronics-crossword-cell{background:#fff;cursor:pointer;padding:0;color:#10203a;font-weight:800;font-size:clamp(12px,1.55vw,20px);display:flex;align-items:center;justify-content:center;transition:background .12s,box-shadow .12s}
    .electronics-crossword-cell:hover{background:#eef2ff}.electronics-crossword-cell.word-selected{background:#e8eaff}.electronics-crossword-cell.selected{background:#6651e8;color:#fff;box-shadow:inset 0 0 0 2px #4f3dd7;z-index:2}
    .electronics-crossword-cell.correct{background:#dcfce7;color:#166534}.electronics-crossword-cell.incorrect{background:#fee2e2;color:#b91c1c}
    .electronics-crossword-number{position:absolute;top:2px;left:3px;font-size:clamp(7px,.65vw,10px);font-weight:800;color:#64748b;line-height:1}.electronics-crossword-cell.selected .electronics-crossword-number{color:#fff}.electronics-crossword-letter{line-height:1;margin-top:3px}
    .electronics-crossword-status{margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:14px}.electronics-crossword-status strong{font-size:15px}
    .electronics-crossword-actions{display:flex;gap:10px;margin-top:14px}.electronics-crossword-actions .btn{min-width:120px}
    .electronics-crossword-side{display:flex;flex-direction:column;gap:16px}.electronics-crossword-instructions{padding:20px}.electronics-crossword-instructions .icon{width:38px;height:38px;border-radius:11px;background:#eeecff;display:grid;place-items:center;margin-bottom:12px;font-size:19px}.electronics-crossword-instructions h2{font-size:17px;margin:0 0 8px}.electronics-crossword-instructions p{font-size:14px;line-height:1.6;color:#64748b;margin:0}
    .electronics-crossword-clues{padding:20px}.electronics-crossword-clues h2{font-size:18px;margin:0 0 12px}.electronics-crossword-clue-section+.electronics-crossword-clue-section{margin-top:24px}
    .electronics-crossword-clue{display:grid;grid-template-columns:32px 1fr;gap:8px;width:100%;text-align:left;border:0;background:transparent;border-radius:10px;padding:9px 8px;cursor:pointer;color:#24324a}.electronics-crossword-clue:hover{background:#f1f5f9}.electronics-crossword-clue.active{background:#eeecff;color:#4033a7}.electronics-crossword-clue-number{font-weight:800}.electronics-crossword-clue-text{font-size:14px;line-height:1.4}
    @media(max-width:1050px){.electronics-crossword-layout{grid-template-columns:1fr}.electronics-crossword-board{max-width:620px}.electronics-crossword-side{display:grid;grid-template-columns:1fr 1fr}}
    @media(max-width:700px){.electronics-crossword-page{padding:22px 16px 40px}.electronics-crossword-header{flex-direction:column}.electronics-crossword-header h1{font-size:28px}.electronics-crossword-board-card{padding:12px}.electronics-crossword-side{display:flex}.electronics-crossword-status{align-items:flex-start;flex-direction:column}.electronics-crossword-actions{width:100%}.electronics-crossword-actions .btn{flex:1}}
  `;

  function injectStyles(){if(document.getElementById('electronics-crossword-styles'))return;const s=document.createElement('style');s.id='electronics-crossword-styles';s.textContent=CROSSWORD_CSS;document.head.appendChild(s)}
  function key(r,c){return `${r}-${c}`}
  function cells(e){return Array.from({length:e.answer.length},(_,i)=>({row:e.row+(e.direction==='down'?i:0),col:e.col+(e.direction==='across'?i:0)}))}
  function entryAt(r,c,d){return state?.challenge.entries.find(e=>e.direction===d&&cells(e).some(p=>p.row===r&&p.col===c))||null}
  function selectedEntry(){return state?.selected?entryAt(state.selected.row,state.selected.col,state.direction):null}

  function reset(){
    const entries=CHALLENGE.entries.map(e=>({...e,answer:e.answer.toUpperCase()}));
    const board=Array.from({length:GRID_SIZE},()=>Array.from({length:GRID_SIZE},()=>({active:false,number:null,entries:[]})));
    entries.forEach(e=>cells(e).forEach((p,i)=>{const cell=board[p.row][p.col];cell.active=true;if(!cell.entries.includes(e.number))cell.entries.push(e.number);if(i===0&&cell.number==null)cell.number=e.number}));
    state={challenge:{...CHALLENGE,entries},board,answers:{},selected:{row:entries[0].row,col:entries[0].col},direction:entries[0].direction,answered:false,correct:0,total:board.flat().filter(c=>c.active).length};
  }

  function selectCell(r,c){
    const cell=state?.board[r]?.[c];if(!cell?.active)return;
    if(state.selected?.row===r&&state.selected?.col===c&&cell.entries.length>1){const other=state.direction==='across'?'down':'across';if(entryAt(r,c,other))state.direction=other}else if(!entryAt(r,c,state.direction))state.direction=entryAt(r,c,'across')?'across':'down';
    state.selected={row:r,col:c};rerender();
  }
  function selectClue(n,d){const e=state?.challenge.entries.find(x=>x.number===n&&x.direction===d);if(!e)return;state.direction=d;state.selected={row:e.row,col:e.col};rerender()}
  function move(step){const e=selectedEntry();if(!e)return;const list=cells(e),i=list.findIndex(p=>p.row===state.selected.row&&p.col===state.selected.col),n=list[Math.max(0,Math.min(list.length-1,i+step))];state.selected={row:n.row,col:n.col}}
  function typeLetter(ch){const v=String(ch).toUpperCase().replace(/[^A-Z]/g,'').charAt(0);if(!v||!state)return;if(!state.selected)state.selected={row:CHALLENGE.entries[0].row,col:CHALLENGE.entries[0].col};state.answers[key(state.selected.row,state.selected.col)]=v;state.answered=false;move(1);rerender()}
  function backspace(){if(!state?.selected)return;const k=key(state.selected.row,state.selected.col);if(state.answers[k])delete state.answers[k];else{move(-1);if(state.selected)delete state.answers[key(state.selected.row,state.selected.col)]}state.answered=false;rerender()}
  function toggle(){if(!state?.selected)return;const other=state.direction==='across'?'down':'across';if(entryAt(state.selected.row,state.selected.col,other)){state.direction=other;rerender()}}
  function arrow(dr,dc){if(!state?.selected)return;let r=state.selected.row+dr,c=state.selected.col+dc;while(r>=0&&r<GRID_SIZE&&c>=0&&c<GRID_SIZE){if(state.board[r][c].active){state.selected={row:r,col:c};if(dc&&entryAt(r,c,'across'))state.direction='across';if(dr&&entryAt(r,c,'down'))state.direction='down';rerender();return}r+=dr;c+=dc}}

  function check(){if(!state)return;let correct=0;state.challenge.entries.forEach(e=>cells(e).forEach((p,i)=>{if((state.answers[key(p.row,p.col)]||'')===e.answer[i])correct++}));state.correct=correct;state.answered=true;rerender();if(typeof window.toast==='function')window.toast(correct===state.total?'🎉 Crossword complete!':`${correct} of ${state.total} letters correct`)}
  function clear(){if(!state)return;state.answers={};state.correct=0;state.answered=false;state.selected={row:state.challenge.entries[0].row,col:state.challenge.entries[0].col};state.direction='across';rerender()}
  function reveal(){if(!state)return;state.challenge.entries.forEach(e=>cells(e).forEach((p,i)=>state.answers[key(p.row,p.col)]=e.answer[i]));state.correct=state.total;state.answered=true;rerender()}
  function start(){injectStyles();reset();if(typeof window.go==='function')window.go('explore-crossword')}
  function exit(){state=null;if(typeof window.go==='function')window.go('explore')}

  function cellClass(r,c){const cell=state.board[r][c];if(!cell.active)return'electronics-crossword-block';const a=['electronics-crossword-cell'],word=selectedEntry();if(word&&cells(word).some(p=>p.row===r&&p.col===c))a.push('word-selected');if(state.selected?.row===r&&state.selected?.col===c)a.push('selected');if(state.answered){const e=state.challenge.entries.find(x=>cells(x).some(p=>p.row===r&&p.col===c));if(e){const i=cells(e).findIndex(p=>p.row===r&&p.col===c),v=state.answers[key(r,c)]||'';if(v)a.push(v===e.answer[i]?'correct':'incorrect')}}return a.join(' ')}
  function boardHtml(){let h='';for(let r=0;r<GRID_SIZE;r++)for(let c=0;c<GRID_SIZE;c++){const cell=state.board[r][c];if(!cell.active){h+='<div class="electronics-crossword-block" aria-hidden="true"></div>';continue}const v=state.answers[key(r,c)]||'';h+=`<button type="button" class="${cellClass(r,c)}" data-crossword-cell="1" data-row="${r}" data-col="${c}">${cell.number!=null?`<span class="electronics-crossword-number">${cell.number}</span>`:''}<span class="electronics-crossword-letter">${v}</span></button>`}return h}
  function clues(d){return state.challenge.entries.filter(e=>e.direction===d).sort((a,b)=>a.number-b.number).map(e=>`<button type="button" class="electronics-crossword-clue${selectedEntry()?.number===e.number&&state.direction===d?' active':''}" data-crossword-clue="1" data-number="${e.number}" data-direction="${d}"><span class="electronics-crossword-clue-number">${e.number}</span><span class="electronics-crossword-clue-text">${e.clue}</span></button>`).join('')}

  function view(){injectStyles();if(!state)reset();const complete=state.answered&&state.correct===state.total;return `<section class="electronics-crossword-page"><header class="electronics-crossword-header"><button type="button" class="btn" data-action="exit-electronics-crossword">← Exit</button><div><span class="electronics-crossword-eyebrow">ELECTRONICS • GAME</span><h1>${CHALLENGE.title}</h1><p>${CHALLENGE.subtitle}</p></div></header><div class="electronics-crossword-layout"><section class="electronics-crossword-card electronics-crossword-board-card"><div class="electronics-crossword-board-title"><strong>Crossword</strong><span>${state.total} squares</span></div><div id="electronicsCrosswordBoard" class="electronics-crossword-board">${boardHtml()}</div><div class="electronics-crossword-status"><strong>${complete?'🎉 Crossword complete!':`${state.correct} / ${state.total} correct`}</strong><span>${complete?'You solved every electronics term.':'Fill the grid, then check your answers.'}</span></div><div class="electronics-crossword-actions"><button type="button" class="btn" data-action="crossword-clear">Clear</button><button type="button" class="btn primary" data-action="crossword-submit">Check Answers</button></div></section><aside class="electronics-crossword-side"><section class="electronics-crossword-card electronics-crossword-instructions"><div class="icon">🧩</div><h2>How to play</h2><p>${CHALLENGE.instruction}</p></section><section class="electronics-crossword-card electronics-crossword-clues"><div class="electronics-crossword-clue-section"><h2>Across</h2>${clues('across')}</div><div class="electronics-crossword-clue-section"><h2>Down</h2>${clues('down')}</div></section></aside></div></section>`}
  function rerender(){injectStyles();if(typeof window.render==='function')window.render()}

  document.addEventListener('keydown',e=>{if(!document.getElementById('electronicsCrosswordBoard')||['INPUT','TEXTAREA'].includes(e.target?.tagName))return;if(/^[a-zA-Z]$/.test(e.key)){e.preventDefault();typeLetter(e.key)}else if(e.key==='Backspace'){e.preventDefault();backspace()}else if(e.key===' '){e.preventDefault();toggle()}else if(e.key==='ArrowRight'){e.preventDefault();arrow(0,1)}else if(e.key==='ArrowLeft'){e.preventDefault();arrow(0,-1)}else if(e.key==='ArrowDown'){e.preventDefault();arrow(1,0)}else if(e.key==='ArrowUp'){e.preventDefault();arrow(-1,0)}});
  document.addEventListener('click',e=>{const cell=e.target.closest?.('[data-crossword-cell]');if(cell){selectCell(Number(cell.dataset.row),Number(cell.dataset.col));return}const clue=e.target.closest?.('[data-crossword-clue]');if(clue)selectClue(Number(clue.dataset.number),clue.dataset.direction)});

  window.ExploreGames=window.ExploreGames||{};
  Object.assign(window.ExploreGames,{electronicsCrosswordView:view,startElectronicsCrossword:start,submitElectronicsCrossword:check,clearElectronicsCrossword:clear,exitElectronicsCrossword:exit,revealElectronicsCrossword:reveal,restartElectronicsCrossword:start,nextElectronicsCrossword:start,getElectronicsCrosswordState:()=>state});
  injectStyles();
  console.log('EcE Hub Electronics Crossword loaded');
})();