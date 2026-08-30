/* EcE Hub — keep the Flashcards workspace page focused on creation/study. */
(() => {
  'use strict';

  function install() {
    if (typeof window.flashcardsView !== 'function') return false;
    if (window.flashcardsView.__eceHubCleanup === true) return true;

    const originalFlashcardsView = window.flashcardsView;

    function cleanedFlashcardsView() {
      // Study mode must continue using the application's existing renderer.
      if (window.studyState) {
        return originalFlashcardsView.apply(this, arguments);
      }

      // The workspace landing page intentionally does not render the
      // community-set grid or the non-functional "Open Classes" card.
      return (
        pageTitle(
          'Flashcards',
          'Create and manage your flashcard study sets.'
        ) +
        `<div class="flashcards-actions">
          <button
            type="button"
            class="btn primary"
            data-action="open-ai-flashcard-maker">
            ✨ AI Flashcard Maker
          </button>
        </div>`
      );
    }

    cleanedFlashcardsView.__eceHubCleanup = true;
    cleanedFlashcardsView.__eceHubOriginal = originalFlashcardsView;
    window.flashcardsView = cleanedFlashcardsView;
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 20) clearInterval(timer);
    }, 50);
  }
})();
