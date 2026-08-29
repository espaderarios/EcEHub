/* EcE Hub — community workspace hotfixes
 * Fixes the workspace POST path and shields community edit requests from
 * malformed absolute URLs produced by an older communityFetch wrapper.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';

  function token() {
    try {
      return localStorage.getItem('ecehub_community_session')
        || localStorage.getItem('ecehub_session_token')
        || '';
    } catch {
      return '';
    }
  }

  function normalizePath(path) {
    const value = String(path || '').trim();

    if (!value) return '/';

    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (/^https?:\/[^/]/i.test(value)) {
      const fixed = value.replace(/^https?:\//i, 'https://');
      const url = new URL(fixed);
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (value.startsWith('https//')) {
      const url = new URL(`https://${value.slice(6)}`);
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return value.startsWith('/') ? value : `/${value}`;
  }

  async function directCommunityRequest(path, options = {}) {
    const normalized = normalizePath(path);
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const bearer = token();
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const response = await fetch(`${API}${normalized}`, {
      ...options,
      credentials: 'include',
      headers
    });

    let data = {};
    try {
      data = await response.json();
    } catch {}

    if (!response.ok) {
      const error = new Error(
        data?.error || `Community API request failed (${response.status}).`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /* Make the edit modal use a known-good relative request. */
  window.getFlashcardSet = async function getFlashcardSetHotfix(setId) {
    if (!setId) throw new Error('Flashcard set ID is required.');

    const result = await directCommunityRequest(
      `/api/flashcards/${encodeURIComponent(setId)}`
    );

    return result?.set || null;
  };

  /*
   * This listener is intentionally installed before community-profile-fix.js.
   * That script's old handler posts to /api/workspace with a JSON body, while
   * the Worker expects POST /api/workspace/{setId}.
   */
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-action="add-community-set"]');
    if (!button) return;

    const setId = button.dataset.id;
    if (!setId) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (button.dataset.workspaceBusy === '1') return;
    button.dataset.workspaceBusy = '1';
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Adding…';

    try {
      await directCommunityRequest(
        `/api/workspace/${encodeURIComponent(setId)}`,
        { method: 'POST' }
      );

      if (typeof window.toast === 'function') {
        window.toast('Flashcard set added to your workspace.');
      }

      /*
       * If the Flashcards workspace is already rendered, remove its old
       * extension section. Its MutationObserver will immediately rebuild it
       * from the updated server state.
       */
      document.querySelector('.community-workspace-section')?.remove();
      document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh', {
        detail: { setId }
      }));
    } catch (error) {
      console.error('Failed to add community flashcard set to workspace:', error);
      if (typeof window.toast === 'function') {
        window.toast(error?.message || 'Could not add flashcard set to workspace.');
      }
    } finally {
      button.dataset.workspaceBusy = '0';
      button.disabled = false;
      button.textContent = originalText;
    }
  }, true);

  console.log('EcE Hub community workspace hotfix installed.');
})();
