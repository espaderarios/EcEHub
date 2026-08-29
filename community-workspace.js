/* EcE Hub — unified Flashcards workspace
 *
 * The Flashcards workspace contains:
 *   1. normal local/private EcE Hub sets; and
 *   2. community sets owned by the user or added with + Workspace.
 *
 * Private sets belonging to other users are never rendered here.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const LOCAL_KEY = 'eceHubDataV3';
  let loading = false;
  let lastSignature = '';

  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function me() {
    return window.communityUser || null;
  }

  function localData() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  async function request(path, options = {}) {
    if (typeof window.communityFetch === 'function') {
      return window.communityFetch(path, options);
    }

    let token = '';
    try {
      token = localStorage.getItem('ecehub_session_token')
        || localStorage.getItem('ecehub_community_session')
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

  function listFrom(payload) {
    if (Array.isArray(payload?.sets)) return payload.sets;
    if (Array.isArray(payload?.flashcards)) return payload.flashcards;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  function normalize(raw, source) {
    const nested = raw?.flashcardSet || raw?.set || {};
    const item = { ...nested, ...raw };
    const author = item.author || {};
    const authorId = text(
      item.authorId || item.author_id || author.id || item.userId || item.user_id
    );
    const username = text(
      item.authorUsername || item.author_username || author.username || author.name
    );

    const user = me();
    const owned = Boolean(
      user && (
        (authorId && authorId === text(user.id)) ||
        (username && username.toLowerCase() === text(user.username).toLowerCase())
      )
    );

    const cards = Array.isArray(item.cards)
      ? item.cards
      : Array.isArray(item.flashcards)
        ? item.flashcards
        : [];

    return {
      id: text(item.id || item.setId || item.flashcardSetId),
      title: text(item.title || 'Untitled set'),
      subject: text(item.subject || 'General'),
      description: text(item.description || ''),
      visibility: text(item.visibility || item.setVisibility || 'public').toLowerCase(),
      cardCount: Number(item.cardCount ?? item.card_count ?? cards.length),
      authorId,
      authorUsername: username,
      authorName: text(item.authorName || item.author_display_name || author.displayName || author.username),
      source,
      owned
    };
  }

  async function loadCommunitySets() {
    const results = await Promise.allSettled([
      request('/api/workspace?limit=100'),
      request('/api/flashcards?limit=100')
    ]);

    const workspace = results[0].status === 'fulfilled'
      ? listFrom(results[0].value).map(x => normalize(x, 'workspace'))
      : [];

    const available = results[1].status === 'fulfilled'
      ? listFrom(results[1].value).map(x => normalize(x, 'owned'))
      : [];

    const merged = new Map();

    /* Only the current user's own sets may come from /api/flashcards. */
    for (const set of available) {
      if (set.id && set.owned) {
        merged.set(set.id, set);
      }
    }

    /* Workspace contains public sets the user explicitly added. */
    for (const set of workspace) {
      if (!set.id) continue;
      if (set.visibility === 'private' && !set.owned) continue;
      merged.set(set.id, { ...set, source: set.owned ? 'owned' : 'workspace' });
    }

    return [...merged.values()];
  }

  function localCard(set) {
    const cards = Array.isArray(set.cards) ? set.cards : [];
    return `
      <article class="card workspace-flashcard-card">
        <div class="workspace-flashcard-top">
          <span class="workspace-flashcard-icon">▧</span>
          <span class="workspace-flashcard-badge private">Private</span>
        </div>
        <h3>${esc(set.title || 'Untitled set')}</h3>
        <p class="workspace-flashcard-subject">${esc(set.subject || 'General')}</p>
        <div class="workspace-flashcard-meta">${cards.length} card${cards.length === 1 ? '' : 's'} · Local workspace</div>
        <div class="workspace-flashcard-actions">
          <button type="button" class="btn primary" data-action="study-set" data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn" data-action="open-set" data-id="${esc(set.id)}">Cards</button>
          <button type="button" class="btn" data-action="edit-set" data-id="${esc(set.id)}">Edit</button>
          <button type="button" class="btn danger" data-action="delete-set" data-id="${esc(set.id)}">Delete</button>
        </div>
      </article>`;
  }

  function communityCard(set) {
    const owned = set.owned;
    const badge = owned ? 'Your community set' : 'Added to workspace';
    const visibility = set.visibility === 'private' ? 'Private' : 'Public';

    return `
      <article class="card workspace-flashcard-card">
        <div class="workspace-flashcard-top">
          <span class="workspace-flashcard-icon">▧</span>
          <span class="workspace-flashcard-badge ${set.visibility === 'private' ? 'private' : ''}">${visibility}</span>
        </div>
        <button type="button" class="workspace-flashcard-title" data-action="view-community-set" data-id="${esc(set.id)}">${esc(set.title)}</button>
        <p class="workspace-flashcard-subject">${esc(set.subject)}</p>
        ${set.description ? `<p class="workspace-flashcard-description">${esc(set.description)}</p>` : ''}
        <div class="workspace-flashcard-meta">${set.cardCount} card${set.cardCount === 1 ? '' : 's'} · ${esc(badge)}</div>
        <div class="workspace-flashcard-actions">
          <button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn" data-action="view-community-set" data-id="${esc(set.id)}">Cards</button>
          ${owned ? `<button type="button" class="btn" data-action="edit-community-set" data-id="${esc(set.id)}">Edit</button>` : ''}
          ${!owned && set.source === 'workspace' ? `<button type="button" class="btn" data-community-workspace-remove="${esc(set.id)}">Remove</button>` : ''}
        </div>
        ${owned ? `<div class="workspace-flashcard-note">Edit this set to switch between Public and Private.</div>` : ''}
      </article>`;
  }

  function injectStyles() {
    if (document.getElementById('unified-flashcards-workspace-styles')) return;

    const style = document.createElement('style');
    style.id = 'unified-flashcards-workspace-styles';
    style.textContent = `
      .workspace-flashcards-root{margin-top:28px;padding-bottom:50px}
      .workspace-flashcards-toolbar{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin:0 0 18px}
      .workspace-flashcards-toolbar h2{margin:0}
      .workspace-flashcards-toolbar p{margin:5px 0 0;color:var(--muted);font-size:var(--font-small)}
      .workspace-flashcards-section{margin-top:30px}
      .workspace-flashcards-section:first-of-type{margin-top:0}
      .workspace-flashcards-section-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:14px}
      .workspace-flashcards-section-head h2{margin:0}
      .workspace-flashcards-section-head p{margin:4px 0 0;color:var(--muted);font-size:var(--font-small)}
      .workspace-flashcards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
      .workspace-flashcard-card{min-width:0;padding:18px;overflow:hidden}
      .workspace-flashcard-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
      .workspace-flashcard-icon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(99,72,255,.15);color:var(--purple,#6348ff);font-weight:800}
      .workspace-flashcard-badge{font-size:11px;font-weight:750;border-radius:999px;padding:5px 9px;background:rgba(70,180,255,.12);color:var(--blue,#40a9ff)}
      .workspace-flashcard-badge.private{background:rgba(255,170,70,.12);color:#d98b20}
      .workspace-flashcard-card h3{margin:0;line-height:1.35}
      .workspace-flashcard-title{display:block;width:100%;padding:0;border:0;background:transparent;color:var(--text);font:inherit;font-size:var(--font-subheading);font-weight:800;text-align:left;cursor:pointer;line-height:1.35}
      .workspace-flashcard-title:hover{color:var(--purple,#6348ff)}
      .workspace-flashcard-subject{margin:6px 0 0;color:var(--muted);font-size:var(--font-small)}
      .workspace-flashcard-description{margin:10px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
      .workspace-flashcard-meta{margin-top:12px;color:var(--muted);font-size:12px}
      .workspace-flashcard-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}
      .workspace-flashcard-actions .btn{flex:1;min-width:76px;white-space:nowrap}
      .workspace-flashcard-note{margin-top:11px;color:var(--muted);font-size:12px}
      .workspace-flashcards-empty{padding:22px;text-align:center;color:var(--muted)}
      @media(max-width:1100px){.workspace-flashcards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.workspace-flashcards-grid{grid-template-columns:1fr}.workspace-flashcards-toolbar,.workspace-flashcards-section-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  async function removeCommunitySet(setId) {
    try {
      await request(`/api/workspace/${encodeURIComponent(setId)}`, { method: 'DELETE' });
      lastSignature = '';
      await render(true);
      if (typeof window.toast === 'function') window.toast('Removed from your workspace.');
    } catch (error) {
      console.error('Failed to remove community workspace set:', error);
      if (typeof window.toast === 'function') window.toast(error?.message || 'Could not remove this set.');
    }
  }

  async function render(force = false) {
    const content = document.getElementById('content');
    const active = !!document.querySelector('.nav-item[data-route="flashcards"].active');
    if (!content || !active || window.studyState) return;
    if (loading) return;

    const existing = content.querySelector('.workspace-flashcards-root');
    if (existing && !force) return;
    if (existing) existing.remove();

    loading = true;
    injectStyles();

    try {
      const local = localData();
      const localSets = Array.isArray(local.sets) ? local.sets : [];
      const community = await loadCommunitySets();

      const signature = JSON.stringify({
        local: localSets.map(s => [s.id, s.title, Array.isArray(s.cards) ? s.cards.length : 0]),
        community: community.map(s => [s.id, s.visibility, s.cardCount, s.source]).sort()
      });

      if (!force && signature === lastSignature) return;
      lastSignature = signature;

      if (!document.body.contains(content)) return;

      const root = document.createElement('div');
      root.className = 'workspace-flashcards-root';
      root.innerHTML = `
        <div class="workspace-flashcards-toolbar">
          <div>
            <h2>Your Flashcards Workspace</h2>
            <p>Private local sets and community flashcards you own or added to your workspace.</p>
          </div>
          <button type="button" class="btn primary" data-action="add-set">+ New Set</button>
        </div>

        <section class="workspace-flashcards-section">
          <div class="workspace-flashcards-section-head">
            <div>
              <h2>Private Flashcards</h2>
              <p>Your normal EcE Hub study sets stored in this browser.</p>
            </div>
            <strong>${localSets.length}</strong>
          </div>
          ${localSets.length
            ? `<div class="workspace-flashcards-grid">${localSets.map(localCard).join('')}</div>`
            : `<div class="workspace-flashcards-empty card">No private flashcard sets yet. Create one with <strong>+ New Set</strong>.</div>`}
        </section>

        <section class="workspace-flashcards-section">
          <div class="workspace-flashcards-section-head">
            <div>
              <h2>Community &amp; Workspace Flashcards</h2>
              <p>Public sets you added and your own community sets.</p>
            </div>
            <strong>${community.length}</strong>
          </div>
          ${community.length
            ? `<div class="workspace-flashcards-grid">${community.map(communityCard).join('')}</div>`
            : `<div class="workspace-flashcards-empty card">No community flashcards are in your workspace yet. Add one from Home, Search, or Classes.</div>`}
        </section>
      `;

      content.appendChild(root);
    } catch (error) {
      console.warn('Unified flashcards workspace unavailable:', error);
    } finally {
      loading = false;
    }
  }

  document.addEventListener('click', event => {
    const remove = event.target.closest('[data-community-workspace-remove]');
    if (!remove) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    removeCommunitySet(text(remove.dataset.communityWorkspaceRemove));
  }, true);

  document.addEventListener('ecehub:community-flashcard-updated', () => {
    lastSignature = '';
    setTimeout(() => render(true), 0);
  });

  document.addEventListener('ecehub:community-workspace-refresh', () => {
    lastSignature = '';
    setTimeout(() => render(true), 0);
  });

  const observer = new MutationObserver(() => {
    const active = !!document.querySelector('.nav-item[data-route="flashcards"].active');
    if (active && !document.querySelector('.workspace-flashcards-root')) {
      render();
    }
  });

  function install() {
    injectStyles();
    const content = document.getElementById('content');
    if (content) observer.observe(content, { childList: true });
    setTimeout(() => render(), 350);
    console.log('EcE Hub unified Flashcards workspace installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
