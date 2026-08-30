/* EcE Hub — community flashcards inside each class
 *
 * Classes already render the user's private/local sets. This extension adds
 * a second, subject-filtered Community Flashcards section only when a class
 * is open. It no longer appends one generic community list to the Classes
 * landing page.
 */
(() => {
  'use strict';

  const LOCAL_KEY = 'eceHubDataV3';
  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  let activeKey = '';
  let loading = false;

  function localData() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function currentClass() {
    const classes = Array.isArray(localData().classes) ? localData().classes : [];
    const heading = text(document.querySelector('#content h1')?.textContent);
    if (!heading) return null;
    return classes.find(item => text(item.name).toLowerCase() === heading.toLowerCase()) || null;
  }

  function classDetailIsVisible() {
    return !!currentClass()
      && !!document.querySelector('.nav-item[data-route="classes"].active')
      && !!document.querySelector('.set-grid');
  }

  function injectStyles() {
    if (document.getElementById('community-classes-v2-styles')) return;
    const style = document.createElement('style');
    style.id = 'community-classes-v2-styles';
    style.textContent = `
      .class-private-flashcards-heading{margin:26px 0 14px}
      .class-private-flashcards-heading h2{margin:0}
      .class-private-flashcards-heading p{margin:5px 0 0;color:var(--muted);font-size:var(--font-small)}
      .class-community-flashcards{margin-top:34px;padding-top:28px;border-top:1px solid var(--border,#dfe4ee)}
      .class-community-flashcards-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px}
      .class-community-flashcards-head h2{margin:0}.class-community-flashcards-head p{margin:5px 0 0;color:var(--muted);font-size:var(--font-small)}
      .class-community-flashcards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
      .class-community-flashcard{min-width:0;padding:18px;overflow:hidden}
      .class-community-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
      .class-community-icon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(99,72,255,.15);color:var(--purple,#6348ff);font-weight:800}
      .class-community-badge{font-size:11px;font-weight:750;border-radius:999px;padding:5px 9px;background:rgba(70,180,255,.12);color:var(--blue,#40a9ff)}
      .class-community-title{display:block;width:100%;padding:0;border:0;background:transparent;color:var(--text);font:inherit;font-size:var(--font-subheading);font-weight:800;text-align:left;cursor:pointer;line-height:1.35}
      .class-community-title:hover{color:var(--purple,#6348ff)}
      .class-community-subject{margin-top:5px;color:var(--muted);font-size:var(--font-small)}
      .class-community-description{margin-top:10px;color:var(--muted);font-size:12px;line-height:1.45;min-height:34px}
      .class-community-meta{margin-top:11px;color:var(--muted);font-size:12px}
      .class-community-author{margin-top:4px;color:var(--muted);font-size:12px}
      .class-community-actions{display:flex;gap:7px;margin-top:15px}.class-community-actions .btn{flex:1;white-space:nowrap}
      .class-community-empty{padding:22px;text-align:center;color:var(--muted)}
      @media(max-width:1100px){.class-community-flashcards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.class-community-flashcards-grid{grid-template-columns:1fr}.class-community-flashcards-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function normalize(set) {
    return {
      ...set,
      id: text(set?.id || set?.setId || set?.flashcardSetId),
      title: text(set?.title || 'Untitled set'),
      subject: text(set?.subject || 'General'),
      description: text(set?.description || ''),
      visibility: text(set?.visibility || 'public').toLowerCase(),
      cardCount: Number(set?.cardCount ?? set?.card_count ?? (Array.isArray(set?.cards) ? set.cards.length : 0)),
      authorUsername: text(set?.authorUsername || set?.author_username || set?.author?.username),
      authorName: text(set?.authorName || set?.author?.displayName || set?.author?.username)
    };
  }

  async function loadForClass(className) {
    if (typeof window.getCommunityFlashcards === 'function') {
      return (await window.getCommunityFlashcards({ subject: className, limit: 100 }))
        .map(normalize)
        .filter(set => set.visibility === 'public' || !set.visibility);
    }

    if (typeof window.communityFetch === 'function') {
      const params = new URLSearchParams({ subject: className, limit: '100' });
      const result = await window.communityFetch(`/api/flashcards?${params}`);
      return (Array.isArray(result?.sets) ? result.sets : []).map(normalize);
    }

    return [];
  }

  function card(set) {
    const author = set.authorName || set.authorUsername || 'Community member';
    const description = set.description || 'Public community flashcard set.';
    return `
      <article class="class-community-flashcard card">
        <div class="class-community-top">
          <div class="class-community-icon">▧</div>
          <span class="class-community-badge">Public</span>
        </div>
        <button type="button" class="class-community-title" data-action="view-community-set" data-id="${esc(set.id)}">${esc(set.title)}</button>
        <div class="class-community-subject">${esc(set.subject)}</div>
        <div class="class-community-description">${esc(description.slice(0, 150))}${description.length > 150 ? '…' : ''}</div>
        <div class="class-community-meta">${set.cardCount} card${set.cardCount === 1 ? '' : 's'}</div>
        <div class="class-community-author">by ${esc(author)}</div>
        <div class="class-community-actions">
          <button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(set.id)}">Study</button>
          <button type="button" class="btn" data-action="add-community-set" data-id="${esc(set.id)}">+ Workspace</button>
        </div>
      </article>`;
  }

  async function render() {
    const cls = currentClass();
    if (!cls || !classDetailIsVisible() || loading) return;

    const key = `${cls.id}:${cls.name}`;
    const existing = document.querySelector('.class-community-flashcards');
    if (existing && activeKey === key) return;
    if (existing) existing.remove();

    activeKey = key;
    loading = true;
    injectStyles();

    try {
      const grid = document.querySelector('.set-grid');
      if (grid && !grid.previousElementSibling?.classList.contains('class-private-flashcards-heading')) {
        const heading = document.createElement('div');
        heading.className = 'class-private-flashcards-heading';
        heading.innerHTML = `<h2>Private Flashcards</h2><p>Your personal study sets for ${esc(cls.name)}.</p>`;
        grid.parentNode.insertBefore(heading, grid);
      }

      const section = document.createElement('section');
      section.className = 'class-community-flashcards';
      section.innerHTML = `
        <div class="class-community-flashcards-head">
          <div>
            <h2>Community Flashcards</h2>
            <p>Public sets shared by EcE Hub students for ${esc(cls.name)}.</p>
          </div>
          <strong class="class-community-count">…</strong>
        </div>
        <div class="class-community-flashcards-grid">
          <div class="class-community-empty card">Loading community flashcards…</div>
        </div>`;

      const detail = document.querySelector('.set-grid')?.parentElement || document.getElementById('content');
      if (!detail) return;
      detail.appendChild(section);

      const sets = await loadForClass(text(cls.name));
      if (!document.body.contains(section)) return;

      section.querySelector('.class-community-count').textContent = String(sets.length);
      const target = section.querySelector('.class-community-flashcards-grid');
      target.innerHTML = sets.length
        ? sets.map(card).join('')
        : `<div class="class-community-empty card">No public community flashcards for this class yet.</div>`;
    } catch (error) {
      console.warn('Class community flashcards unavailable:', error);
      const section = document.querySelector('.class-community-flashcards');
      if (section) {
        section.querySelector('.class-community-flashcards-grid').innerHTML = `<div class="class-community-empty card">Community flashcards could not be loaded.</div>`;
      }
    } finally {
      loading = false;
    }
  }

  function install() {
    injectStyles();
    const observer = new MutationObserver(() => {
      const active = !!document.querySelector('.nav-item[data-route="classes"].active');
      if (!active) {
        activeKey = '';
        document.querySelector('.class-community-flashcards')?.remove();
        document.querySelector('.class-private-flashcards-heading')?.remove();
        return;
      }
      render();
    });

    const content = document.getElementById('content');
    if (content) observer.observe(content, { childList: true, subtree: true });
    setTimeout(render, 250);
    console.log('EcE Hub class-scoped community flashcards installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
