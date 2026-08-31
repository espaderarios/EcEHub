/* ============================================================
   EcE Hub — Electronics Crossword Input UX Fix

   The crossword engine owns the answers/validation. This layer only
   makes keyboard focus respect cells that have already been locked by
   a correctly solved word (including shared intersections).
   ============================================================ */
(function () {
  'use strict';

  const CELL_SELECTOR = '.electronics-crossword-cell';
  let redirecting = false;
  let observerTimer = 0;

  function getBoard() {
    return document.getElementById('electronicsCrosswordBoard');
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

    // Walk only through the currently selected crossword word. A non-cell
    // block ends the word, so we never jump across unrelated grid areas.
    for (let i = 0; i < 30; i += 1) {
      if (direction === 'down') r += step;
      else c += step;

      const next = cellAt(r, c);
      if (!next) return null;
      if (next.classList.contains('locked')) {
        continue;
      }
      if (!next.classList.contains('word-selected')) {
        return null;
      }
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
      // Let the crossword's own click handler finish before accepting the
      // next keyboard event.
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

    // Existing crossword validation remains untouched. If focus is sitting
    // on an intersection that became locked by another solved word, move to
    // the next editable square before the original keyboard handler runs.
    if (getSelectedCell()?.classList.contains('locked')) {
      const moved = redirectLockedSelection();
      if (moved) return;
    }
  }

  function keepSelectionEditable() {
    if (!getBoard()) return;
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(() => {
      redirectLockedSelection();
    }, 0);
  }

  function install() {
    if (document.documentElement.dataset.eceCrosswordInputFix === '1') return;
    document.documentElement.dataset.eceCrosswordInputFix = '1';

    // Capture phase runs before electronics-crossword.js's document-level
    // keyboard handler, allowing us to move focus without duplicating input.
    document.addEventListener('keydown', handleKeydown, true);

    const observer = new MutationObserver(keepSelectionEditable);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', () => {
      window.setTimeout(keepSelectionEditable, 0);
    }, true);

    console.log('EcE Hub crossword locked-cell input fix installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
