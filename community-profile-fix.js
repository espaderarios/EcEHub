/* EcE Hub — community user profile + workspace actions */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

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
      const error = new Error(
        data?.error || `Community API request failed (${response.status}).`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function toast(message) {
    if (typeof window.toast === 'function') {
      window.toast(message);
      return;
    }
    console.info(message);
  }

  function injectStyles() {
    if (document.getElementById('community-profile-view-styles')) return;

    const style = document.createElement('style');
    style.id = 'community-profile-view-styles';
    style.textContent = `
      .community-public-profile{max-width:1050px;margin:0 auto;padding:28px 0 56px}
      .community-public-profile-back{margin-bottom:18px}
      .community-public-profile-hero{display:flex;gap:22px;align-items:center;padding:26px;border-radius:20px;margin-bottom:28px}
      .community-public-profile-avatar{width:92px;height:92px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;background:rgba(99,72,255,.18);flex:0 0 92px}
      .community-public-profile-avatar img{width:100%;height:100%;object-fit:cover}
      .community-public-profile-name{margin:0 0 4px;font-size:30px}
      .community-public-profile-username{margin:0 0 10px;opacity:.68}
      .community-public-profile-bio{margin:0;max-width:720px;line-height:1.55;opacity:.82}
      .community-public-profile-heading{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:0 0 14px}
      .community-public-profile-heading h2{margin:0}
      .community-public-profile-heading p{margin:3px 0 0;opacity:.68}
      .community-public-profile-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
      .community-public-profile-set{padding:18px;border-radius:16px}
      .community-public-profile-set h3{margin:0 0 7px}
      .community-public-profile-set .subject{opacity:.7;margin-bottom:12px}
      .community-public-profile-set .description{opacity:.78;line-height:1.45;min-height:42px}
      .community-public-profile-set .meta{margin-top:12px;font-size:13px;opacity:.62}
      .community-public-profile-set .actions{display:flex;gap:8px;margin-top:15px}
      .community-public-profile-empty{padding:28px;text-align:center}
      .community-public-profile-loading{padding:35px;text-align:center;opacity:.75}
      @media(max-width:700px){
        .community-public-profile{padding:18px 0 40px}
        .community-public-profile-hero{align-items:flex-start;flex-direction:column}
      }
    `;
    document.head.appendChild(style);
  }

  async function currentUser() {
    if (window.communityUser?.id) return window.communityUser;

    try {
      const result = await request('/api/users/me');
      return result?.user || null;
    } catch {
      return null;
    }
  }

  function normalizeSet(raw) {
    return {
      ...raw,
      id: raw?.id || raw?.setId || raw?.flashcardSetId || '',
      title: text(raw?.title || 'Untitled set'),
      subject: text(raw?.subject || 'General'),
      description: text(raw?.description || ''),
      visibility: text(raw?.visibility || raw?.setVisibility || '').toLowerCase(),
      authorId: raw?.authorId || raw?.author_id || '',
      authorUsername: text(
        raw?.authorUsername ||
        raw?.author_username ||
        raw?.username ||
        raw?.authorName ||
        ''
      ),
      cardCount: Number(
        raw?.cardCount ??
        raw?.card_count ??
        (Array.isArray(raw?.cards) ? raw.cards.length : 0)
      )
    };
  }

  function isPublicSet(set) {
    const visibility = text(set.visibility).toLowerCase();
    return !visibility || visibility === 'public';
  }

  function belongsToUser(set, user) {
    const id = text(set.authorId);
    const username = text(set.authorUsername).toLowerCase();
    return (
      (id && id === text(user.id)) ||
      (username && username === text(user.username).toLowerCase())
    );
  }

  async function loadPublicSetsForUser(user) {
    const found = [];
    const seen = new Set();

    const add = list => {
      if (!Array.isArray(list)) return;
      for (const raw of list) {
        const set = normalizeSet(raw);
        if (!set.id || seen.has(set.id)) continue;
        if (!isPublicSet(set)) continue;
        if (!belongsToUser(set, user)) continue;
        seen.add(set.id);
        found.push(set);
      }
    };

    try {
      const result = await request(
        `/api/search?q=${encodeURIComponent(user.username)}`
      );
      add(result?.flashcards);
      add(result?.communityFlashcards);
      add(result?.sets);
      add(result?.data);
    } catch (error) {
      console.warn('Profile search lookup failed:', error);
    }

    const queryNames = ['authorId', 'author_id', 'author'];
    for (const key of queryNames) {
      try {
        const result = await request(
          `/api/flashcards?limit=100&${key}=${encodeURIComponent(user.id)}`
        );
        add(result?.sets);
        add(result?.flashcards);
        add(result?.data);
      } catch {
        // Endpoint may not support this query name; continue.
      }
      if (found.length) break;
    }

    return found;
  }

  function setCard(set) {
    return `
      <article class="community-public-profile-set card">
        <h3>${esc(set.title)}</h3>
        <div class="subject">${esc(set.subject)}</div>
        <div class="description">
          ${esc(set.description || 'Public community flashcard set.')}
        </div>
        <div class="meta">
          ${set.cardCount} card${set.cardCount === 1 ? '' : 's'} · Public
        </div>
        <div class="actions">
          <button type="button" class="btn primary"
            data-action="study-community-set"
            data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn"
            data-action="add-community-set"
            data-id="${esc(set.id)}">+ Workspace</button>
        </div>
      </article>`;
  }

  async function openCommunityUserProfile(userOrId, usernameHint = '') {
    injectStyles();

    const content = document.getElementById('content');
    if (!content) return;

    const candidate = typeof userOrId === 'object'
      ? userOrId
      : { id: userOrId, username: usernameHint };

    const me = await currentUser();

    if (
      me &&
      (
        (candidate.id && candidate.id === me.id) ||
        (candidate.username && text(candidate.username).toLowerCase() === text(me.username).toLowerCase())
      )
    ) {
      if (typeof window.go === 'function') {
        window.go('profile');
      }
      return;
    }

    content.innerHTML = `
      <div class="community-public-profile">
        <button type="button" class="btn community-public-profile-back"
          data-community-profile-back>← Back to search</button>
        <div class="community-public-profile-loading card">
          Loading profile…
        </div>
      </div>`;

    let user = candidate;

    try {
      const result = await request(
        `/api/search?q=${encodeURIComponent(candidate.username || usernameHint)}`
      );

      const users = Array.isArray(result?.users) ? result.users : [];
      const exact = users.find(item =>
        (candidate.id && item.id === candidate.id) ||
        (candidate.username &&
          text(item.username).toLowerCase() === text(candidate.username).toLowerCase())
      );

      if (exact) user = exact;
    } catch (error) {
      console.warn('Could not refresh community profile:', error);
    }

    const sets = await loadPublicSetsForUser(user);

    const avatar = user.avatarUrl
      ? `<img src="${esc(user.avatarUrl)}" alt="">`
      : esc((user.displayName || user.username || '?').slice(0, 1).toUpperCase());

    content.innerHTML = `
      <div class="community-public-profile">
        <button type="button" class="btn community-public-profile-back"
          data-community-profile-back>← Back to search</button>

        <section class="community-public-profile-hero card">
          <div class="community-public-profile-avatar">${avatar}</div>
          <div>
            <h1 class="community-public-profile-name">
              ${esc(user.displayName || user.username || 'Community member')}
            </h1>
            <p class="community-public-profile-username">
              @${esc(user.username || '')}
            </p>
            ${user.bio ? `<p class="community-public-profile-bio">${esc(user.bio)}</p>` : ''}
          </div>
        </section>

        <div class="community-public-profile-heading">
          <div>
            <h2>Public Flashcards</h2>
            <p>Flashcard sets shared publicly by this community member.</p>
          </div>
          <strong>${sets.length}</strong>
        </div>

        ${
          sets.length
            ? `<div class="community-public-profile-grid">${sets.map(setCard).join('')}</div>`
            : `<div class="community-public-profile-empty card">
                <h3>No public flashcards yet</h3>
                <p>This user hasn't shared any flashcard sets publicly.</p>
              </div>`
        }
      </div>`;

    history.pushState(
      { communityProfile: user.username || '' },
      '',
      `?community_profile=${encodeURIComponent(user.username || '')}`
    );

    content.querySelector('[data-community-profile-back]')?.addEventListener('click', () => {
      history.back();
    });
  }

  async function addCommunitySetToWorkspace(setId) {
    if (!setId) return;

    try {
      const payloads = [
        { flashcardSetId: setId },
        { flashcard_set_id: setId },
        { setId }
      ];

      let lastError = null;

      for (const body of payloads) {
        try {
          await request('/api/workspace', {
            method: 'POST',
            body: JSON.stringify(body)
          });
          toast('Flashcard set added to your workspace.');
          return true;
        } catch (error) {
          lastError = error;
          if (![400, 404, 422].includes(Number(error?.status))) break;
        }
      }

      throw lastError || new Error('Could not add the flashcard set to your workspace.');
    } catch (error) {
      console.error('Failed to add community flashcard set to workspace:', error);
      toast(error?.message || 'Could not add flashcard set to workspace.');
      return false;
    }
  }

  function interceptClicks() {
    document.addEventListener('click', event => {
      const userHit = event.target.closest('[data-action="view-community-user"]');
      if (userHit) {
        event.preventDefault();
        event.stopPropagation();

        openCommunityUserProfile({
          id: userHit.dataset.id || '',
          username: userHit.dataset.username || '',
          displayName: userHit.dataset.displayName || '',
          avatarUrl: userHit.dataset.avatarUrl || '',
          bio: userHit.dataset.bio || ''
        });
        return;
      }

      const workspace = event.target.closest('[data-action="add-community-set"]');
      if (workspace) {
        event.preventDefault();
        event.stopPropagation();
        addCommunitySetToWorkspace(workspace.dataset.id || '');
      }
    }, true);
  }

  function restoreProfileFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('community_profile');
    if (!username) return;

    setTimeout(() => {
      openCommunityUserProfile({ username });
    }, 0);
  }

  window.openCommunityUserProfile = openCommunityUserProfile;
  window.addCommunitySetToWorkspace = addCommunitySetToWorkspace;

  injectStyles();
  interceptClicks();
  window.addEventListener('popstate', () => {
    if (!new URLSearchParams(window.location.search).has('community_profile')) {
      if (typeof window.render === 'function') window.render();
    }
  });
  window.addEventListener('load', restoreProfileFromUrl);

  console.log('EcE Hub community profiles + workspace actions installed.');
})();
