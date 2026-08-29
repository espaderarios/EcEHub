/* EcE Hub — Community flashcards in the Flashcards workspace
 *
 * The normal Flashcards workspace contains local/private sets. This extension
 * adds the community side of the same workspace: sets authored by the current
 * user (public or private) plus public community sets the user added with
 * + Workspace.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const state = { loading: false, signature: '' };

  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function currentUser() {
    return window.communityUser || null;
  }

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
      const error = new Error(data?.error || `Community API request failed (${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function normalize(raw, source = 'workspace') {
    const author = raw?.author || {};
    const authorId = text(raw?.authorId || raw?.author_id || author.id);
    const user = currentUser();

    return {
      ...raw,
      id: text(raw?.id || raw?.setId || raw?.flashcardSetId),
      title: text(raw?.title || 'Untitled set'),
      subject: text(raw?.subject || 'General'),
      description: text(raw?.description || ''),
      visibility: text(raw?.visibility || raw?.setVisibility || 'public').toLowerCase(),
      cardCount: Number(raw?.cardCount ?? raw?.card_count ?? (Array.isArray(raw?.cards) ? raw.cards.length : 0)),
      authorId,
      authorUsername: text(raw?.authorUsername || raw?.author_username || author.username),
      authorName: text(raw?.authorName || raw?.author_display_name || author.displayName),
      source,
      owned: Boolean(user && authorId && authorId === user.id)
    };
  }

  function listFrom(payload) {
    if (Array.isArray(payload?.sets)) return payload.sets;
    if (Array.isArray(payload?.flashcards)) return payload.flashcards;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  async function loadCommunityWorkspace() {
    const [workspaceResult, flashcardResult] = await Promise.allSettled([
      request('/api/workspace?limit=100'),
      request('/api/flashcards?limit=100')
    ]);

    const workspaceSets = workspaceResult.status === 'fulfilled'
      ? listFrom(workspaceResult.value).map(item => normalize(item, 'workspace'))
      : [];

    const availableSets = flashcardResult.status === 'fulfilled'
      ? listFrom(flashcardResult.value).map(item => normalize(item, 'owned'))
      : [];

    const me = currentUser();
    const ownedSets = me
      ? availableSets.filter(set => set.owned)
      : [];

    /*
     * Never expose another user's private set. Workspace entries are only
     * accepted when they are public, or when the current user owns the set.
     */
    const safeWorkspaceSets = workspaceSets.filter(set =>
      set.visibility !== 'private' || set.owned
    );

    const merged = new Map();

    for (const set of ownedSets) {
      merged.set(set.id, { ...set, source: 'owned' });
    }

    for (const set of safeWorkspaceSets) {
      if (!merged.has(set.id)) {
        merged.set(set.id, { ...set, source: 'workspace' });
      }
    }

    return Array.from(merged.values());
  }

  function injectStyles() {
    if (document.getElementById('community-workspace-styles')) return;

    const style = document.createElement('style');
    style.id = 'community-workspace-styles';
    style.textContent = `
      .community-workspace-section{margin-top:32px;padding-top:28px;border-top:1px solid var(--border,#dfe4ee)}
      .community-workspace-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px}
      .community-workspace-head h2{margin:0}
      .community-workspace-head p{margin:5px 0 0;color:var(--muted);font-size:var(--font-small)}
      .community-workspace-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
      .community-workspace-card{min-width:0;padding:18px;position:relative;overflow:hidden}
      .community-workspace-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
      .community-workspace-icon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(99,72,255,.15);color:var(--purple,#6348ff);font-weight:800}
      .community-workspace-badge{font-size:11px;font-weight:750;border-radius:999px;padding:5px 9px;background:rgba(99,72,255,.12);color:var(--purple,#8d78ff)}
      .community-workspace-badge.private{background:rgba(255,170,70,.12);color:#d98b20}
      .community-workspace-title{display:block;width:100%;padding:0;border:0;background:transparent;color:var(--text);font:inherit;font-size:var(--font-subheading);font-weight:800;text-align:left;cursor:pointer;line-height:1.35}
      .community-workspace-title:hover{color:var(--purple,#6348ff)}
      .community-workspace-subject{margin-top:5px;color:var(--muted);font-size:var(--font-small)}
      .community-workspace-meta{margin-top:11px;color:var(--muted);font-size:12px}
      .community-workspace-owner{margin-top:4px;color:var(--muted);font-size:12px}
      .community-workspace-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}
      .community-workspace-actions .btn{flex:1;min-width:86px;white-space:nowrap}
      .community-workspace-empty{padding:22px;text-align:center;color:var(--muted)}
      .community-workspace-note{margin-top:12px;color:var(--muted);font-size:12px}
      @media(max-width:1100px){.community-workspace-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.community-workspace-grid{grid-template-columns:1fr}.community-workspace-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function card(set) {
    const isPrivate = set.visibility === 'private';
    const ownerLabel = set.owned
      ? 'Your community set'
      : `Added from ${set.authorName || set.authorUsername || 'Community'}`;

    return `
      <article class="community-workspace-card card" data-community-workspace-id="${esc(set.id)}">
        <div class="community-workspace-top">
          <div class="community-workspace-icon">▧</div>
          <span class="community-workspace-badge ${isPrivate ? 'private' : ''}">${isPrivate ? 'Private' : 'Public'}</span>
        </div>

        <button type="button" class="community-workspace-title" data-action="view-community-set" data-id="${esc(set.id)}">
          ${esc(set.title)}
        </button>

        <div class="community-workspace-subject">${esc(set.subject)}</div>

        <div class="community-workspace-meta">
          ${set.cardCount} card${set.cardCount === 1 ? '' : 's'} · ${esc(ownerLabel)}
        </div>

        <div class="community-workspace-actions">
          <button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn" data-action="open-community-set" data-id="${esc(set.id)}">Cards</button>
          ${set.owned ? `<button type="button" class="btn" data-action="edit-community-set" data-id="${esc(set.id)}">Edit</button>` : ''}
          ${!set.owned ? `<button type="button" class="btn" data-community-workspace-remove="${esc(set.id)}">Remove</button>` : ''}
        </div>

        ${set.owned ? `<div class="community-workspace-note">You can change this set between Public and Private from Edit.</div>` : ''}
      </article>`;
  }

  async function removeFromWorkspace(setId) {
    if (!setId) return;

    try {
      await request(`/api/workspace/${encodeURIComponent(setId)}`, {
        method: 'DELETE'
      });

      if (typeof window.toast === 'function') {
        window.toast('Flashcard set removed from your workspace.');
      }

      state.signature = '';
      await render(true);
    } catch (error) {
      console.error('Failed to remove community workspace set:', error);
      if (typeof window.toast === 'function') {
        window.toast(error?.message || 'Could not remove flashcard set from workspace.');
      }
    }
  }

  async function render(force = false) {
    const content = document.getElementById('content');
    const active = !!document.querySelector('.nav-item[data-route="flashcards"].active');
    if (!content || !active) return;
    if (state.loading) return;

    injectStyles();

    const existing = content.querySelector('.community-workspace-section');
    if (existing && !force) return;
    if (existing) existing.remove();

    state.loading = true;

    try {
      const sets = await loadCommunityWorkspace();
      if (!document.body.contains(content)) return;

      const signature = sets.map(set => `${set.id}:${set.visibility}:${set.cardCount}:${set.source}`).sort().join('|');
      if (!force && signature === state.signature) return;
      state.signature = signature;

      const section = document.createElement('section');
      section.className = 'community-workspace-section';
      section.innerHTML = `
        <div class="community-workspace-head">
          <div>
            <h2>Community Flashcards in Workspace</h2>
            <p>Your private community sets and public sets you added to your workspace.</p>
          </div>
        </div>
        ${sets.length
          ? `<div class="community-workspace-grid">${sets.map(card).join('')}</div>`
          : `<div class="community-workspace-empty card">No community flashcards are in your workspace yet.</div>`}
      `;

      content.appendChild(section);
    } catch (error) {
      console.warn('Community workspace unavailable:', error);
    } finally {
      state.loading = false;
    }
  }

  document.addEventListener('click', event => {
    const remove = event.target.closest('[data-community-workspace-remove]');
    if (!remove) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    removeFromWorkspace(text(remove.dataset.communityWorkspaceRemove));
  }, true);

  const observer = new MutationObserver(() => {
    const active = !!document.querySelector('.nav-item[data-route="flashcards"].active');
    if (active) render();
  });

  function install() {
    injectStyles();
    const content = document.getElementById('content');
    const sidebar = document.getElementById('sidebar');
    if (content) observer.observe(content, { childList: true, subtree: true });
    if (sidebar) observer.observe(sidebar, { childList: true, subtree: true, attributes: true });
    setTimeout(() => render(), 500);
    console.log('EcE Hub community flashcards workspace installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
