/* EcE Hub — class/set relationship fix
 *
 * Private study sets are stored in localStorage. This bridge makes Classes
 * discover the same sets as the Flashcards Workspace without duplicating or
 * moving them. A set belongs to a class when its classId matches; subject/class
 * name matching remains the backwards-compatible fallback.
 */
(() => {
  'use strict';

  const LOCAL_KEY = 'eceHubDataV3';
  let lastSignature = '';
  let scheduled = false;

  const text = value => String(value ?? '').trim();

  function normalize(value) {
    return text(value)
      .toLowerCase()
      .replace(/[“”‘’]/g, "'")
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function currentClass() {
    const local = readLocal();
    const classes = Array.isArray(local.classes) ? local.classes : [];
    if (!classes.length) return null;

    /* The Classes detail heading is rendered by pageTitle(). Do not depend on
       one particular wrapper class because the UI has changed over time. */
    const heading = normalize(
      document.querySelector('#content .page-title h1')?.textContent
      || document.querySelector('#content h1')?.textContent
    );
    if (!heading) return null;

    return classes.find(cls => normalize(cls.name) === heading) || null;
  }

  function isClassDetail() {
    return !!document.querySelector('.nav-item[data-route="classes"].active')
      && !!currentClass();
  }

  function setsForClass(cls) {
    const local = readLocal();
    const sets = Array.isArray(local.sets) ? local.sets : [];
    if (!cls) return [];

    const className = normalize(cls.name);
    return sets.filter(set => {
      if (set?.classId && cls?.id && String(set.classId) === String(cls.id)) return true;
      return normalize(set?.subject) === className;
    });
  }

  function setCard(set) {
    const cards = Array.isArray(set.cards) ? set.cards : [];
    return `<div class="card set-card subject-set-card" data-action="open-set" data-id="${esc(set.id)}" style="cursor:pointer">
      <div class="class-set-card-top">
        <span class="class-set-card-icon">▧</span>
        <span class="class-set-card-badge">Study Set</span>
      </div>
      <h3>${esc(set.title || 'Untitled set')}</h3>
      <p>${esc(set.subject || '')}</p>
      <div class="set-meta">${cards.length} card${cards.length === 1 ? '' : 's'}</div>
      <div class="actions set-actions" style="margin-top:16px">
        <button type="button" class="btn primary" data-action="study-set" data-id="${esc(set.id)}">Study</button>
        <button type="button" class="btn" data-action="open-set" data-id="${esc(set.id)}">Cards</button>
        <button type="button" class="btn" data-action="edit-set" data-id="${esc(set.id)}">Edit</button>
        <button type="button" class="btn danger" data-action="delete-set" data-id="${esc(set.id)}">Delete</button>
      </div>
    </div>`;
  }

  function updateClassDetail() {
    const active = document.querySelector('.nav-item[data-route="classes"].active');
    if (!active) {
      lastSignature = '';
      return;
    }

    const cls = currentClass();
    if (!cls) return;

    const sets = setsForClass(cls);
    const cards = sets.reduce((sum, set) => sum + (Array.isArray(set.cards) ? set.cards.length : 0), 0);
    const signature = `${cls.id}:${sets.map(set => `${set.id}:${set.title}:${set.subject}:${set.classId || ''}:${set.cards?.length || 0}`).join('|')}`;

    /* Root Classes page: keep the subject-card counters accurate. */
    document.querySelectorAll('.subject-card').forEach(card => {
      const title = normalize(card.querySelector('h3')?.textContent);
      if (title !== normalize(cls.name)) return;
      const meta = card.querySelector('.meta');
      if (meta) meta.textContent = `${sets.length} set${sets.length === 1 ? '' : 's'} · ${cards} cards`;
    });

    if (!isClassDetail()) return;
    if (signature === lastSignature) return;
    lastSignature = signature;

    const oldGrid = document.querySelector('#content .set-grid');
    const empty = [...document.querySelectorAll('#content .card.empty')]
      .find(el => /No sets for this subject yet/i.test(el.textContent || ''));

    if (!sets.length) {
      if (oldGrid) oldGrid.remove();
      if (empty) {
        empty.textContent = `No study sets for ${text(cls.name)} yet. Create a set here or assign an existing set to this class.`;
      }
      return;
    }

    const grid = oldGrid || document.createElement('div');
    grid.className = 'grid set-grid';
    grid.innerHTML = sets.map(setCard).join('');

    if (empty) {
      empty.replaceWith(grid);
    } else if (!oldGrid) {
      const communitySection = document.querySelector('.class-community-flashcards');
      const anchor = communitySection || document.querySelector('#content .drill-hero');
      if (anchor?.parentNode) anchor.parentNode.insertBefore(grid, anchor.nextSibling);
      else document.querySelector('#content')?.appendChild(grid);
    }

    const subtitle = document.querySelector('#content .page-title p');
    if (subtitle) subtitle.textContent = `${sets.length} set${sets.length === 1 ? '' : 's'} · ${cards} cards`;
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateClassDetail();
    });
  }

  function installStyles() {
    if (document.getElementById('classes-sets-fix-styles')) return;
    const style = document.createElement('style');
    style.id = 'classes-sets-fix-styles';
    style.textContent = `
      .class-set-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .class-set-card-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(99,72,255,.12);color:var(--purple,#6348ff);font-weight:800}
      .class-set-card-badge{font-size:10px;font-weight:750;border-radius:999px;padding:5px 8px;background:rgba(99,72,255,.1);color:var(--purple,#8b7cff)}
      #content .set-grid{margin-top:20px}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    const content = document.getElementById('content');
    if (!content) return;

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(content, { childList: true, subtree: true });

    window.addEventListener('storage', event => {
      if (event.key === LOCAL_KEY) {
        lastSignature = '';
        scheduleUpdate();
      }
    });

    document.addEventListener('ecehub:flashcard-data-changed', () => {
      lastSignature = '';
      scheduleUpdate();
    });
    document.addEventListener('ecehub:community-flashcard-updated', () => {
      lastSignature = '';
      scheduleUpdate();
    });

    setTimeout(updateClassDetail, 150);
    setInterval(updateClassDetail, 1200);
    console.log('EcE Hub class/set relationship fix installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
