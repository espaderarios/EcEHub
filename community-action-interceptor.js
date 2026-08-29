/* EcE Hub — community action bridge
 * Runs before the legacy app action dispatcher so community-specific
 * actions are handled by the community implementation first.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';

  const text = value => String(value ?? '').trim();

  function token() {
    try {
      return localStorage.getItem('ecehub_community_session')
        || localStorage.getItem('ecehub_session_token')
        || '';
    } catch {
      return '';
    }
  }

  async function request(path, options = {}) {
    if (typeof window.communityFetch === 'function') {
      return window.communityFetch(path, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const bearer = token();
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers
    });

    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(data?.error || `Community API request failed (${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.info(message);
  }

  async function addSet(setId) {
    if (!setId) return;

    try {
      // The backend route is POST /api/workspace/:flashcardSetId.
      await request(`/api/workspace/${encodeURIComponent(setId)}`, {
        method: 'POST'
      });

      toast('Flashcard set added to your workspace.');

      // Refresh workspace data when the app exposes its normal loader.
      for (const name of ['loadCommunityFlashcards', 'loadFlashcards', 'loadData']) {
        if (typeof window[name] === 'function') {
          try { await window[name](); } catch {}
        }
      }
    } catch (error) {
      console.error('Failed to add community flashcard set to workspace:', error);
      toast(error?.message || 'Could not add flashcard set to workspace.');
    }
  }

  async function openUser(hit) {
    const id = text(hit.dataset.id);
    const username = text(hit.dataset.username);

    if (!id && !username) return;

    const me = window.communityUser;
    if (
      me &&
      ((id && id === text(me.id)) ||
       (username && username.toLocaleLowerCase() === text(me.username).toLocaleLowerCase()))
    ) {
      if (typeof window.go === 'function') {
        window.go('profile');
      }
      return;
    }

    if (typeof window.openCommunityUserProfile === 'function') {
      await window.openCommunityUserProfile({
        id,
        username,
        displayName: text(hit.dataset.displayName),
        avatarUrl: text(hit.dataset.avatarUrl),
        bio: text(hit.dataset.bio)
      });
    }
  }

  document.addEventListener('click', event => {
    const userHit = event.target.closest('[data-action="view-community-user"]');
    if (userHit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openUser(userHit);
      return;
    }

    const workspaceHit = event.target.closest('[data-action="add-community-set"]');
    if (workspaceHit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addSet(text(workspaceHit.dataset.id));
    }
  }, true);

  // Replace the legacy workspace helper with the correct backend route.
  window.addCommunitySetToWorkspace = addSet;

  console.log('EcE Hub community action bridge installed.');
})();
