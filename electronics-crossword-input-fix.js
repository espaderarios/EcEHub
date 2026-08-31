/* ============================================================
   EcE Hub — Electronics Crossword UX + responsive board fix

   Keeps locked-cell keyboard behavior intact and prevents the
   crossword board from being clipped/left vertically scrolled on
   smaller screens. The board is allowed to grow with its full grid;
   the page itself handles scrolling when the viewport is too short.
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
      /* Never crop the crossword itself. The page may scroll, but the
         puzzle grid must always be completely rendered. */
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
      }

      /* The 13×13-style grids need to shrink horizontally on smaller
         screens instead of creating a clipped internal viewport. */
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

      /* Keep the game card from imposing a hidden/cropped height. */
      .electronics-crossword-page,
      .electronics-crossword-game,
      .electronics-crossword-board-wrapper {
        overflow: visible !important;
      }

      /* If the board was previously scrolled by an older layout, don't
         let that stale scroll position hide the first rows. */
      .electronics-crossword-board {
        scroll-behavior: auto !important;
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

    for (let i = 0; i < 30; i += 1) {
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
      const moved = redirectLockedSelection();
      if (moved) return;
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

    window.addEventListener('resize', () => {
      resetBoardScroll();
    }, { passive: true });

    console.log('EcE Hub crossword input + full-grid layout fix installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
