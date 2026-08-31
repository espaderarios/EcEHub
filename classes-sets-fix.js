/* EcE Hub — Classes ↔ Study Sets bridge v3
 * A set created from inside a class belongs to that class, while remaining
 * the exact same private set shown in Flashcards > Workspace.
 */
(() => {
  'use strict';
  const KEY = 'eceHubDataV3';
  const CONTEXT_KEY = 'eceHubPendingClassForSet';
  let pendingClass = null;
  let lastSetsSignature = '';
  let lastRenderedSignature = '';

  const text = v => String(v ?? '').trim();
  const normalize = v => text(v).toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  function read() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || '{}');
      return x && typeof x === 'object' ? x : {};
    } catch { return {}; }
  }

  function write(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    document.dispatchEvent(new CustomEvent('ecehub:flashcard-data-changed'));
  }

  function currentClass() {
    const data = read();
    const classes = Array.isArray(data.classes) ? data.classes : [];
    const heading = normalize(document.querySelector('#content .page-title h1')?.textContent || document.querySelector('#content h1')?.textContent);
    if (!heading) return null;
    return classes.find(c => normalize(c.name) === heading) || null;
  }

  function saveContext(cls) {
    if (!cls) return;
    pendingClass = { id: cls.id, name: text(cls.name) };
    try { sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(pendingClass)); } catch {}
  }

  function getContext() {
    if (pendingClass) return pendingClass;
    try { pendingClass = JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || 'null'); } catch {}
    return pendingClass;
  }

  function getSets(cls) {
    const data = read();
    const sets = Array.isArray(data.sets) ? data.sets : [];
    const id = text(cls?.id);
    const name = normalize(cls?.name);
    return sets.filter(s => {
      if (id && text(s?.classId) === id) return true;
      return normalize(s?.subject) === name;
    });
  }

  function snapshot(data) {
    return (Array.isArray(data.sets) ? data.sets : [])
      .map(s => `${s.id}|${s.title}|${s.subject}|${s.classId || ''}|${Array.isArray(s.cards) ? s.cards.length : 0}`)
      .join('||');
  }

  /* When + New Set is clicked from a class, remember that class before the
     existing app opens its modal. */
  document.addEventListener('click', e => {
    const button = e.target.closest?.('[data-action="add-set"]');
    if (!button) return;
    const cls = currentClass();
    if (cls) {
      saveContext(cls);
      console.log(`EcE Hub: new study set context = ${cls.name}`);
    }
  }, true);

  function associateNewSet() {
    const cls = getContext();
    if (!cls) return;
    const data = read();
    const sets = Array.isArray(data.sets) ? data.sets : [];
    const sig = snapshot(data);
    if (!lastSetsSignature) { lastSetsSignature = sig; return; }
    if (sig === lastSetsSignature) return;

    const oldIds = new Set(lastSetsSignature.split('||').map(x => x.split('|')[0]).filter(Boolean));
    const added = sets.filter(s => s?.id && !oldIds.has(String(s.id)));
    if (!added.length) { lastSetsSignature = sig; return; }

    added.forEach(s => {
      s.classId = cls.id;
      s.subject = cls.name;
    });
    data.sets = sets;
    write(data);
    pendingClass = null;
    try { sessionStorage.removeItem(CONTEXT_KEY); } catch {}
    lastSetsSignature = snapshot(data);
    console.log(`EcE Hub: associated new set(s) with ${cls.name}`);
  }

  /* Repair the exact situation already present in the user's workspace:
     one class + one private/local set with no classId. This is the only
     automatic repair case because the relationship is unambiguous. */
  function repairExistingSet() {
    const cls = currentClass();
    if (!cls) return;
    const data = read();
    const classes = Array.isArray(data.classes) ? data.classes : [];
    const sets = Array.isArray(data.sets) ? data.sets : [];
    if (classes.length !== 1 || sets.length !== 1) return;

    const set = sets[0];
    if (text(set.classId) === text(cls.id)) return;

    set.classId = cls.id;
    set.subject = cls.name;
    data.sets = sets;
    write(data);
    console.log(`EcE Hub: repaired existing set "${set.title || 'Untitled'}" → ${cls.name}`);
  }

  function renderClassSets() {
    const cls = currentClass();
    if (!cls) return;
    const sets = getSets(cls);
    const cards = sets.reduce((n, s) => n + (Array.isArray(s.cards) ? s.cards.length : 0), 0);
    const signature = `${cls.id}:${sets.map(s => `${s.id}:${s.title}:${s.classId}:${s.cards?.length || 0}`).join('|')}`;

    document.querySelectorAll('#content .subject-card').forEach(card => {
      if (normalize(card.querySelector('h3')?.textContent) !== normalize(cls.name)) return;
      const meta = card.querySelector('.meta');
      if (meta) meta.textContent = `${sets.length} set${sets.length === 1 ? '' : 's'} · ${cards} cards`;
    });

    const activeDetail = document.querySelector('.nav-item[data-route="classes"].active') &&
      normalize(document.querySelector('#content .page-title h1')?.textContent) === normalize(cls.name);
    if (!activeDetail || signature === lastRenderedSignature) return;
    lastRenderedSignature = signature;

    const esc = v => text(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    const html = sets.map(s => {
      const count = Array.isArray(s.cards) ? s.cards.length : 0;
      return `<div class="card set-card subject-set-card" data-action="open-set" data-id="${esc(s.id)}" style="cursor:pointer">
        <div class="class-set-card-top"><span class="class-set-card-icon">▧</span><span class="class-set-card-badge">Study Set</span></div>
        <h3>${esc(s.title || 'Untitled set')}</h3>
        <p>${esc(s.subject || cls.name)}</p>
        <div class="set-meta">${count} card${count === 1 ? '' : 's'}</div>
        <div class="actions set-actions" style="margin-top:16px">
          <button type="button" class="btn primary" data-action="study-set" data-id="${esc(s.id)}">Study</button>
          <button type="button" class="btn" data-action="open-set" data-id="${esc(s.id)}">Cards</button>
          <button type="button" class="btn" data-action="edit-set" data-id="${esc(s.id)}">Edit</button>
          <button type="button" class="btn danger" data-action="delete-set" data-id="${esc(s.id)}">Delete</button>
        </div>
      </div>`;
    }).join('');

    const oldGrid = document.querySelector('#content .set-grid');
    const empty = [...document.querySelectorAll('#content .card.empty')].find(x => /No sets for this subject|No study sets for/i.test(x.textContent || ''));
    if (sets.length) {
      const grid = oldGrid || document.createElement('div');
      grid.className = 'grid set-grid';
      grid.innerHTML = html;
      if (empty) empty.replaceWith(grid);
      else if (!oldGrid) {
        const hero = document.querySelector('#content .drill-hero');
        if (hero?.parentNode) hero.parentNode.insertBefore(grid, hero.nextSibling);
      }
    } else if (empty) {
      empty.textContent = `No study sets for ${text(cls.name)} yet. Create one here or from Flashcards.`;
    }

    const subtitle = document.querySelector('#content .page-title p');
    if (subtitle) subtitle.textContent = `${sets.length} set${sets.length === 1 ? '' : 's'} · ${cards} cards`;
  }

  function install() {
    const data = read();
    lastSetsSignature = snapshot(data);
    const content = document.getElementById('content');
    if (!content) return;
    const observer = new MutationObserver(() => {
      associateNewSet();
      repairExistingSet();
      renderClassSets();
    });
    observer.observe(content, { childList: true, subtree: true });
    setInterval(() => {
      associateNewSet();
      repairExistingSet();
      renderClassSets();
    }, 500);
    setTimeout(() => { repairExistingSet(); renderClassSets(); }, 100);
    console.log('EcE Hub Classes ↔ Study Sets bridge v3 installed.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
