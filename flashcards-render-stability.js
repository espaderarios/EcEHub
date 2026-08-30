/* EcE Hub — keep Flashcards rendering single and stable after edits/saves. */
(() => {
  'use strict';

  const LOCAL_KEY = 'eceHubDataV3';
  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  let scheduled = false;
  let editingLocalId = '';

  const text = value => String(value ?? '').trim();

  function isFlashcardsRoute() {
    return document.querySelector('.nav-item[data-route="flashcards"].active') !== null;
  }

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function writeLocal(value) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  }

  async function communityRequest(path, options = {}) {
    if (typeof window.communityFetch === 'function') return window.communityFetch(path, options);
    let token = '';
    try {
      token = localStorage.getItem('ecehub_session_token') || localStorage.getItem('ecehub_community_session') || '';
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
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || `Community API request failed (${response.status}).`);
      error.status = response.status;
      error.data = payload;
      throw error;
    }
    return payload;
  }

  function closeVisibilityModal() {
    document.getElementById('fc-visibility-modal')?.remove();
  }

  async function saveLocalEdit(modal) {
    const status = modal.querySelector('#fc-status');
    const button = modal.querySelector('[data-fc-save]');
    const local = readLocal();
    const sets = Array.isArray(local.sets) ? local.sets : [];
    const original = sets.find(set => set.id === editingLocalId);

    if (!original) {
      status.textContent = 'Private flashcard set not found.';
      return;
    }

    const title = text(modal.querySelector('#fc-title')?.value);
    const subject = text(modal.querySelector('#fc-subject')?.value);
    const description = text(modal.querySelector('#fc-description')?.value);
    const visibility = modal.querySelector('#fc-visibility')?.value === 'public' ? 'public' : 'private';
    const cards = [...modal.querySelectorAll('.fc-visibility-card-row')].map(row => ({
      question: text(row.querySelector('.fc-question')?.value),
      answer: text(row.querySelector('.fc-answer')?.value)
    }));

    if (!title) { status.textContent = 'Please enter a title.'; return; }
    if (!subject) { status.textContent = 'Please enter a subject/class.'; return; }
    if (!cards.length || cards.some(card => !card.question || !card.answer)) {
      status.textContent = 'Every flashcard needs both a question and an answer.';
      return;
    }

    button.disabled = true;
    button.textContent = visibility === 'public' ? 'Publishing…' : 'Saving…';
    status.textContent = '';

    try {
      if (visibility === 'public') {
        const result = await communityRequest('/api/flashcards', {
          method: 'POST',
          body: JSON.stringify({ title, subject, description, visibility: 'public', cards })
        });

        local.sets = sets.filter(set => set.id !== editingLocalId);
        writeLocal(local);
        closeVisibilityModal();
        editingLocalId = '';
        document.dispatchEvent(new CustomEvent('ecehub:community-flashcard-updated', {
          detail: { set: result?.set || null }
        }));
        document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh'));
        if (typeof window.toast === 'function') window.toast('Flashcard set published to the community.');
        return;
      }

      const updated = {
        ...original,
        title,
        subject,
        description,
        cards: cards.map(card => [card.question, card.answer])
      };
      local.sets = sets.map(set => set.id === editingLocalId ? updated : set);
      writeLocal(local);
      closeVisibilityModal();
      editingLocalId = '';
      document.dispatchEvent(new CustomEvent('ecehub:local-flashcard-updated', {
        detail: { set: updated }
      }));
      document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh'));
      if (typeof window.toast === 'function') window.toast('Private flashcard set updated.');
    } catch (error) {
      console.error('Local flashcard edit save failed:', error);
      status.textContent = error?.data?.error || error?.message || 'Could not save this flashcard set.';
      button.disabled = false;
      button.textContent = 'Save Changes';
    }
  }

  function dedupeShell() {
    const shells = document.querySelectorAll('.app-shell');
    for (let i = 1; i < shells.length; i++) shells[i].remove();
    for (const selector of ['.sidebar', '.main', '.topbar', '#content']) {
      const nodes = document.querySelectorAll(selector);
      for (let i = 1; i < nodes.length; i++) nodes[i].remove();
    }
  }

  function stabilize() {
    scheduled = false;
    if (!isFlashcardsRoute()) return;
    dedupeShell();
    document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh', {
      detail: { reason: 'flashcards-render-stability' }
    }));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => setTimeout(stabilize, 0));
  }

  /* Window capture runs before document capture. The existing visibility
   * bridge listens on document capture, so this safely routes local edits
   * without allowing a browser-local id to reach PATCH /api/flashcards/:id. */
  window.addEventListener('click', event => {
    const edit = event.target.closest('[data-action="edit-set"]');
    if (edit) {
      editingLocalId = text(edit.dataset.id);
      return;
    }

    const save = event.target.closest('#fc-visibility-modal [data-fc-save]');
    if (!save || !editingLocalId) return;

    const modal = save.closest('#fc-visibility-modal');
    if (!modal) return;
    const heading = text(modal.querySelector('.fc-visibility-head h2')?.textContent);
    if (!/^Edit Flashcard Set$/i.test(heading)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void saveLocalEdit(modal);
  }, true);

  document.addEventListener('ecehub:community-flashcard-updated', schedule);
  document.addEventListener('ecehub:local-flashcard-updated', schedule);
  document.addEventListener('ecehub:community-workspace-refresh', () => {
    if (isFlashcardsRoute()) setTimeout(() => dedupeShell(), 0);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="edit-set"], [data-action="edit-community-set"], [data-fc-save], [data-community-edit-save]')) schedule();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  console.log('EcE Hub Flashcards render stability installed.');
})();
