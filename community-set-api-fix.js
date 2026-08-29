/* EcE Hub — community set API guard
 *
 * The legacy getFlashcardSet() builder can receive an already-prefixed URL
 * and produce a malformed request such as:
 *   https://ecehub-community...https//ecehub-community.../api/flashcards/...
 *
 * The community edit modal uses window.getFlashcardSet(), so replace that
 * browser-facing helper with a path-only request through communityFetch().
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';

  async function getCommunitySet(setId) {
    const id = String(setId || '').trim();
    if (!id) throw new Error('Flashcard set ID is required.');

    if (typeof window.communityFetch === 'function') {
      const result = await window.communityFetch(
        `/api/flashcards/${encodeURIComponent(id)}`,
        { method: 'GET' }
      );
      return result?.set || null;
    }

    let token = '';
    try {
      token = localStorage.getItem('ecehub_session_token')
        || localStorage.getItem('ecehub_community_session')
        || '';
    } catch {}

    const response = await fetch(
      `${API}/api/flashcards/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `Community API request failed (${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.set || null;
  }

  window.getFlashcardSet = getCommunitySet;

  console.log('EcE Hub community set API guard installed.');
})();
