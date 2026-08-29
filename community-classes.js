/* EcE Hub — Community Flashcards inside Classes */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const state = { sets: null, loading: false, route: '' };

  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function normalize(raw) {
    return {
      ...raw,
      id: raw?.id || raw?.setId || raw?.flashcardSetId || '',
      title: text(raw?.title || 'Untitled set'),
      subject: text(raw?.subject || 'General'),
      description: text(raw?.description || ''),
      visibility: text(raw?.visibility || raw?.setVisibility || '').toLowerCase(),
      authorId: text(raw?.authorId || raw?.author_id),
      authorUsername: text(raw?.authorUsername || raw?.author_username || raw?.username),
      authorName: text(raw?.authorName || raw?.authorDisplayName || ''),
      cardCount: Number(raw?.cardCount ?? raw?.card_count ?? (Array.isArray(raw?.cards) ? raw.cards.length : 0))
    };
  }

  function isPublic(set) {
    const visibility = text(set.visibility).toLowerCase();
    return !visibility || visibility === 'public';
  }

  async function loadSets() {
    if (Array.isArray(state.sets)) return state.sets;
    if (state.loading) {
      while (state.loading) await new Promise(resolve => setTimeout(resolve, 25));
      return state.sets || [];
    }

    state.loading = true;
    try {
      if (typeof window.loadCommunityFlashcards === 'function') {
        const result = await window.loadCommunityFlashcards();
        state.sets = (Array.isArray(result) ? result : [])
          .map(normalize)
          .filter(isPublic);
        return state.sets;
      }

      let token = '';
      try {
        token = localStorage.getItem('ecehub_community_session')
          || localStorage.getItem('ecehub_session_token')
          || '';
      } catch {}

      const response = await fetch(`${API}/api/flashcards?limit=100`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error(`Community flashcards failed (${response.status})`);
      const payload = await response.json();
      const list = Array.isArray(payload?.sets)
        ? payload.sets
        : Array.isArray(payload?.flashcards)
          ? payload.flashcards
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      state.sets = list.map(normalize).filter(isPublic);
      return state.sets;
    } catch (error) {
      console.warn('Classes community flashcards unavailable:', error);
      state.sets = [];
      return state.sets;
    } finally {
      state.loading = false;
    }
  }

  function injectStyles() {
    if (document.getElementById('community-classes-styles')) return;
    const style = document.createElement('style');
    style.id = 'community-classes-styles';
    style.textContent = `
      .community-classes-section{margin-top:34px;padding-top:28px;border-top:1px solid var(--border,#dfe4ee)}
      .community-classes-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px}
      .community-classes-head h2{margin:0}
      .community-classes-head p{margin:5px 0 0;color:var(--muted);font-size:var(--font-small)}
      .community-classes-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
      .community-class-card{min-width:0;padding:18px;position:relative;overflow:hidden}
      .community-class-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
      .community-class-icon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(99,72,255,.15);color:var(--purple,#6348ff);font-weight:800}
      .community-class-badge{font-size:11px;font-weight:750;border-radius:999px;padding:5px 9px;background:rgba(70,180,255,.12);color:var(--blue,#40a9ff)}
      .community-class-title{display:block;width:100%;padding:0;border:0;background:transparent;color:var(--text);font:inherit;font-size:var(--font-subheading);font-weight:800;text-align:left;cursor:pointer;line-height:1.35}
      .community-class-title:hover{color:var(--purple,#6348ff)}
      .community-class-subject{margin-top:5px;color:var(--muted);font-size:var(--font-small)}
      .community-class-description{margin-top:11px;color:var(--muted);font-size:var(--font-small);line-height:1.45;min-height:40px}
      .community-class-meta{margin-top:11px;color:var(--muted);font-size:12px}
      .community-class-author{margin-top:4px;color:var(--muted);font-size:12px}
      .community-class-actions{display:flex;gap:7px;margin-top:15px}
      .community-class-actions .btn{flex:1;white-space:nowrap}
      .community-classes-empty{padding:22px;text-align:center;color:var(--muted)}
      @media(max-width:1100px){.community-classes-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.community-classes-grid{grid-template-columns:1fr}.community-classes-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function card(set) {
    const author = set.authorName || set.authorUsername || 'Community member';
    const count = set.cardCount;
    const description = set.description || 'Public community flashcard set.';
    return `
      <article class="community-class-card card">
        <div class="community-class-top">
          <div class="community-class-icon">▧</div>
          <span class="community-class-badge">Public</span>
        </div>
        <button type="button" class="community-class-title" data-action="view-community-set" data-id="${esc(set.id)}">${esc(set.title)}</button>
        <div class="community-class-subject">${esc(set.subject)}</div>
        <div class="community-class-description">${esc(description.slice(0, 150))}${description.length > 150 ? '…' : ''}</div>
        <div class="community-class-meta">${count} card${count === 1 ? '' : 's'}</div>
        <div class="community-class-author">by ${esc(author)}</div>
        <div class="community-class-actions">
          <button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn" data-action="add-community-set" data-id="${esc(set.id)}">+ Workspace</button>
        </div>
      </article>`;
  }

  async function render() {
    const content = document.getElementById('content');
    const classesActive = !!document.querySelector('.nav-item[data-route="classes"].active');
    if (!content || !classesActive) return;

    if (!content.querySelector('.community-classes-section')) {
      const section = document.createElement('section');
      section.className = 'community-classes-section';
      section.innerHTML = `
        <div class="community-classes-head">
          <div>
            <h2>Community Flashcards</h2>
            <p>Public study sets shared by EcE Hub students.</p>
          </div>
          <button type="button" class="btn" data-route="flashcards">View all</button>
        </div>
        <div class="community-classes-grid">
          <div class="community-classes-empty card">Loading community flashcards…</div>
        </div>`;

      content.appendChild(section);

      const sets = await loadSets();
      if (!document.body.contains(section)) return;
      const grid = section.querySelector('.community-classes-grid');
      if (!sets.length) {
        grid.innerHTML = `<div class="community-classes-empty card">No public community flashcards are available yet.</div>`;
        return;
      }
      grid.innerHTML = sets.slice(0, 6).map(card).join('');
    }
  }

  function install() {
    injectStyles();

    const observer = new MutationObserver(() => {
      const active = !!document.querySelector('.nav-item[data-route="classes"].active');
      if (active && state.route !== 'classes') {
        state.route = 'classes';
        render();
      } else if (!active) {
        state.route = '';
      }
    });

    const content = document.getElementById('content');
    const sidebar = document.getElementById('sidebar');
    if (content) observer.observe(content, { childList: true, subtree: true });
    if (sidebar) observer.observe(sidebar, { childList: true, subtree: true, attributes: true });

    setTimeout(render, 350);
    console.log('EcE Hub Community Flashcards added to Classes.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
