/* EcE Hub — keep Flashcards rendering single and stable after edits/saves. */
(() => {
  'use strict';

  let scheduled = false;

  function isFlashcardsRoute() {
    return document.querySelector('.nav-item[data-route="flashcards"].active') !== null;
  }

  function dedupeShell() {
    const shells = document.querySelectorAll('.app-shell');
    for (let i = 1; i < shells.length; i++) shells[i].remove();

    // The application shell is intentionally singleton. If an older
    // extension accidentally injected duplicate structural elements,
    // keep the first one rather than letting the page become visually
    // stacked after a render.
    for (const selector of ['.sidebar', '.main']) {
      const nodes = document.querySelectorAll(selector);
      for (let i = 1; i < nodes.length; i++) nodes[i].remove();
    }

    for (const selector of ['.topbar', '#content']) {
      const nodes = document.querySelectorAll(selector);
      for (let i = 1; i < nodes.length; i++) nodes[i].remove();
    }
  }

  function stabilize() {
    scheduled = false;
    if (!isFlashcardsRoute()) return;

    dedupeShell();

    // community-workspace.js owns the actual workspace renderer. Ask it to
    // refresh after app.js has finished rebuilding #content.
    document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh', {
      detail: { reason: 'flashcards-render-stability' }
    }));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      setTimeout(stabilize, 0);
    });
  }

  document.addEventListener('ecehub:community-flashcard-updated', schedule);
  document.addEventListener('ecehub:community-workspace-refresh', () => {
    if (isFlashcardsRoute()) {
      setTimeout(() => dedupeShell(), 0);
    }
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="edit-set"], [data-action="edit-community-set"], [data-fc-save], [data-community-edit-save]')) {
      schedule();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  console.log('EcE Hub Flashcards render stability installed.');
})();
