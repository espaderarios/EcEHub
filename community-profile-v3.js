/* EcE Hub — public profile data/render v3
 * Uses the public /api/search response directly, including nested
 * flashcard-set author data, so a user's public sets render correctly.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  async function request(path, options = {}) {
    if (typeof window.communityFetch === 'function') {
      return window.communityFetch(path, options);
    }

    let token = '';
    try {
      token = localStorage.getItem('ecehub_community_session')
        || localStorage.getItem('ecehub_session_token')
        || '';
    } catch {}

    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.info(message);
  }

  function normalizeSet(raw) {
    const author = raw?.author || {};
    return {
      ...raw,
      id: text(raw?.id || raw?.setId || raw?.flashcardSetId),
      title: text(raw?.title || 'Untitled set'),
      subject: text(raw?.subject || 'General'),
      description: text(raw?.description || ''),
      visibility: text(raw?.visibility || '').toLowerCase(),
      cardCount: Number(raw?.cardCount ?? raw?.card_count ?? (Array.isArray(raw?.cards) ? raw.cards.length : 0)),
      authorId: text(raw?.authorId || raw?.author_id || author.id),
      authorUsername: text(raw?.authorUsername || raw?.author_username || author.username),
      authorName: text(raw?.authorName || raw?.author_display_name || author.displayName),
      authorAvatarUrl: text(raw?.authorAvatarUrl || raw?.author_avatar_url || author.avatarUrl)
    };
  }

  async function findUser(candidate) {
    const query = text(candidate?.username || candidate?.displayName || candidate?.id);
    if (!query) return null;

    const result = await request(`/api/search?q=${encodeURIComponent(query)}`);
    const users = Array.isArray(result?.users) ? result.users : [];

    return users.find(user =>
      (candidate?.id && user.id === candidate.id) ||
      (candidate?.username && text(user.username).toLowerCase() === text(candidate.username).toLowerCase())
    ) || null;
  }

  function belongsTo(set, user) {
    return (
      (set.authorId && user.id && set.authorId === user.id) ||
      (set.authorUsername && user.username && set.authorUsername.toLowerCase() === user.username.toLowerCase())
    );
  }

  function renderSet(set) {
    const description = set.description || 'Public community flashcard set.';
    return `
      <article class="community-public-profile-set card">
        <div class="community-public-profile-set-top">
          <span class="community-public-profile-set-badge">Public</span>
        </div>
        <h3>${esc(set.title)}</h3>
        <div class="subject">${esc(set.subject)}</div>
        <div class="description">${esc(description)}</div>
        <div class="meta">${set.cardCount} card${set.cardCount === 1 ? '' : 's'} · Public</div>
        <div class="actions">
          <button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn" data-action="add-community-set" data-id="${esc(set.id)}">+ Workspace</button>
        </div>
      </article>`;
  }

  async function openCommunityUserProfileV3(candidate = {}) {
    const content = document.getElementById('content');
    if (!content) return;

    const me = window.communityUser;
    if (
      me &&
      ((candidate.id && candidate.id === me.id) ||
       (candidate.username && text(candidate.username).toLowerCase() === text(me.username).toLowerCase()))
    ) {
      if (typeof window.go === 'function') window.go('profile');
      return;
    }

    content.innerHTML = `
      <div class="community-public-profile">
        <button type="button" class="btn community-public-profile-back" data-community-profile-back>← Back</button>
        <div class="community-public-profile-loading card">Loading profile…</div>
      </div>`;

    let user = candidate;
    let searchResult = null;

    try {
      searchResult = await request(`/api/search?q=${encodeURIComponent(candidate.username || candidate.displayName || '')}`);
      const users = Array.isArray(searchResult?.users) ? searchResult.users : [];
      user = users.find(item =>
        (candidate.id && item.id === candidate.id) ||
        (candidate.username && text(item.username).toLowerCase() === text(candidate.username).toLowerCase())
      ) || user;
    } catch (error) {
      console.warn('Could not load community profile:', error);
    }

    const rawSets = Array.isArray(searchResult?.flashcards) ? searchResult.flashcards : [];
    const sets = rawSets
      .map(normalizeSet)
      .filter(set => (!set.visibility || set.visibility === 'public') && belongsTo(set, user));

    const name = text(user.displayName || user.username || 'Community member');
    const username = text(user.username);
    const avatar = user.avatarUrl
      ? `<img src="${esc(user.avatarUrl)}" alt="">`
      : esc(name.slice(0, 1).toUpperCase() || '?');

    content.innerHTML = `
      <div class="community-public-profile">
        <button type="button" class="btn community-public-profile-back" data-community-profile-back>← Back</button>
        <section class="community-public-profile-hero card">
          <div class="community-public-profile-avatar">${avatar}</div>
          <div>
            <h1 class="community-public-profile-name">${esc(name)}</h1>
            <p class="community-public-profile-username">@${esc(username)}</p>
            ${user.bio ? `<p class="community-public-profile-bio">${esc(user.bio)}</p>` : '<p class="community-public-profile-bio">EcE Hub community member.</p>'}
          </div>
        </section>

        <div class="community-public-profile-heading">
          <div>
            <h2>Public Flashcards</h2>
            <p>Study sets this user has chosen to share with the community.</p>
          </div>
          <strong>${sets.length}</strong>
        </div>

        ${sets.length
          ? `<div class="community-public-profile-grid">${sets.map(renderSet).join('')}</div>`
          : `<div class="community-public-profile-empty card"><h3>No public flashcards yet</h3><p>This user hasn't shared any flashcard sets publicly.</p></div>`}
      </div>`;

    const back = content.querySelector('[data-community-profile-back]');
    back?.addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else if (typeof window.go === 'function') window.go('home');
    });

    history.pushState(
      { communityProfile: username },
      '',
      `?community_profile=${encodeURIComponent(username)}`
    );
  }

  window.openCommunityUserProfile = openCommunityUserProfileV3;
  window.communityProfileV3Ready = true;
  console.log('EcE Hub public community profile v3 installed.');
})();
