/* EcE Hub — ensure the Flashcards workspace mounts on the first route visit.
 *
 * Some of the Flashcards extensions load after app.js and the SPA can finish
 * rendering the route before community-workspace.js sees the active nav item.
 * This bridge waits for the route/content to settle and asks the existing
 * workspace renderer to mount. It does not render a second workspace itself.
 */
(() => {
  'use strict';

  const ROOT_SELECTOR = '.workspace-flashcards-root';
  let timer = 0;
  let lastRoute = '';
  let observer = null;

  function isFlashcardsRoute() {
    return !!document.querySelector('.nav-item[data-route="flashcards"].active');
  }

  function ensureWorkspace() {
    if (!isFlashcardsRoute()) return;
    const content = document.getElementById('content');
    if (!content) return;
    if (content.querySelector(ROOT_SELECTOR)) return;
    if (window.studyState) return;

    /* community-workspace.js owns the actual renderer. Its listener calls
       render(true), including the local/private sets and community sets. */
    document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh', {
      detail: { reason: 'first-flashcards-route-visit' }
    }));
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      ensureWorkspace();
      /* A delayed second pass covers the async route transition/API startup
         without creating duplicate markup. */
      timer = setTimeout(ensureWorkspace, 350);
    }, 40);
  }

  function watch() {
    const content = document.getElementById('content');
    if (!content) return;

    if (!observer) {
      observer = new MutationObserver(() => {
        const route = isFlashcardsRoute() ? 'flashcards' : 'other';
        if (route !== lastRoute) {
          lastRoute = route;
          schedule();
        } else if (route === 'flashcards' && !content.querySelector(ROOT_SELECTOR)) {
          schedule();
        }
      });
      observer.observe(content, { childList: true, subtree: true });
    }

    schedule();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.nav-item[data-route="flashcards"]')) schedule();
  }, true);

  document.addEventListener('ecehub:community-workspace-refresh', () => {
    if (isFlashcardsRoute()) setTimeout(ensureWorkspace, 25);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch, { once: true });
  } else {
    watch();
  }

  console.log('EcE Hub Flashcards initial render fix installed.');
})();
