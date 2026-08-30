/* EcE Hub — local flashcard edit save hotfix
 *
 * flashcard-visibility.js is intentionally kept for the existing creation UI,
 * but its old edit path incorrectly PATCHed local browser IDs against the
 * community API. This hotfix intercepts saves for local-set edits before that
 * handler runs. Community-set edits continue to use community-ui-fix.js.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const LOCAL_KEY = 'eceHubDataV3';
  let editingLocalId = '';

  const text = value => String(value ?? '').trim();

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

  function writeLocal(value) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  }

  async function request(path, options = {}) {
    if (typeof window.communityFetch === 'function') {
      return window.communityFetch(path, options);
    }

    let bearer = '';
    try {
      bearer = localStorage.getItem('ecehub_session_token')
        || localStorage.getItem('ecehub_community_session')
        || '';
    } catch {}

    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
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

  function closeModal() {
    document.getElementById('fc-visibility-modal')?.remove();
  }

  function isLocalEditModal(modal) {
    if (!modal || !editingLocalId) return false;
    const heading = text(modal.querySelector('.fc-visibility-head h2')?.textContent);
    return /^Edit Flashcard Set$/i.test(heading);
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
    const visibility = modal.querySelector('#fc-visibility')?.value === 'public'
      ? 'public'
      : 'private';
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
        /* Local browser IDs are not community IDs. Publish as a new set. */
        const result = await request('/api/flashcards', {
          method: 'POST',
          body: JSON.stringify({
            title,
            subject,
            description,
            visibility: 'public',
            cards
          })
        });

        local.sets = sets.filter(set => set.id !== editingLocalId);
        writeLocal(local);

        closeModal();
        editingLocalId = '';
        document.dispatchEvent(new CustomEvent('ecehub:community-flashcard-updated', {
          detail: { set: result?.set || null }
        }));
        document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh'));
        if (typeof window.toast === 'function') {
          window.toast('Flashcard set published to the community.');
        }
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

      closeModal();
      editingLocalId = '';
      document.dispatchEvent(new CustomEvent('ecehub:local-flashcard-updated', {
        detail: { set: updated }
      }));
      document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh'));
      if (typeof window.toast === 'function') {
        window.toast('Private flashcard set updated.');
      }
    } catch (error) {
      console.error('Local flashcard edit save failed:', error);
      status.textContent = error?.data?.error || error?.message || 'Could not save this flashcard set.';
      button.disabled = false;
      button.textContent = 'Save Changes';
    }
  }

  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-action="edit-set"]');
    if (edit) {
      editingLocalId = text(edit.dataset.id);
      return;
    }

    const save = event.target.closest('#fc-visibility-modal [data-fc-save]');
    if (!save) return;

    const modal = save.closest('#fc-visibility-modal');
    if (!isLocalEditModal(modal)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    saveLocalEdit(modal);
  }, true);

  console.log('EcE Hub local flashcard edit save hotfix installed.');
})();
