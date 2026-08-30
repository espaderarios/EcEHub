/* EcE Hub — private/public flashcard creation bridge
 *
 * Local sets remain browser-private by default. Choosing Public creates a
 * real community flashcard set through the Cloudflare API. Converting an
 * existing local set to Public publishes it and removes the local copy.
 * Community sets use the existing community edit modal for later visibility
 * changes.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const LOCAL_KEY = 'eceHubDataV3';

  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function writeLocal(data) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }

  function token() {
    try {
      return localStorage.getItem('ecehub_session_token')
        || localStorage.getItem('ecehub_community_session')
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
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || `Community API request failed (${response.status}).`);
      error.status = response.status;
      error.data = payload;
      throw error;
    }
    return payload;
  }

  function normalizeCards(cards) {
    return (Array.isArray(cards) ? cards : [])
      .map(card => {
        if (Array.isArray(card)) return [text(card[0]), text(card[1])];
        return [text(card?.question), text(card?.answer)];
      })
      .filter(card => card[0] && card[1]);
  }

  function style() {
    if (document.getElementById('flashcard-visibility-styles')) return;
    const style = document.createElement('style');
    style.id = 'flashcard-visibility-styles';
    style.textContent = `
      .fc-visibility-modal{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px}
      .fc-visibility-card{width:min(900px,96vw);max-height:94vh;overflow:auto;background:var(--card,#101d36);color:var(--text,#fff);border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.35)}
      .fc-visibility-head{display:flex;justify-content:space-between;gap:18px;padding:22px 24px;border-bottom:1px solid rgba(127,127,127,.2)}
      .fc-visibility-head h2{margin:0 0 5px}.fc-visibility-head p{margin:0;color:var(--muted)}
      .fc-visibility-close{border:0;background:transparent;color:inherit;font-size:28px;cursor:pointer}
      .fc-visibility-body{padding:22px 24px}.fc-visibility-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .fc-visibility-field{display:flex;flex-direction:column;gap:7px}.fc-visibility-field.full{grid-column:1/-1}
      .fc-visibility-field input,.fc-visibility-field textarea,.fc-visibility-field select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid rgba(127,127,127,.3);border-radius:10px;background:transparent;color:inherit;font:inherit}
      .fc-visibility-field textarea{resize:vertical}.fc-visibility-label{font-weight:750}
      .fc-visibility-help{font-size:12px;color:var(--muted);line-height:1.4}.fc-visibility-cards{display:flex;flex-direction:column;gap:12px;margin-top:20px}
      .fc-visibility-card-row{border:1px solid rgba(127,127,127,.22);border-radius:13px;padding:13px}.fc-visibility-card-row-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .fc-visibility-card-row textarea{width:100%;box-sizing:border-box;margin-top:8px;padding:9px;border:1px solid rgba(127,127,127,.3);border-radius:9px;background:transparent;color:inherit;font:inherit}
      .fc-visibility-footer{display:flex;justify-content:flex-end;gap:9px;padding:16px 24px;border-top:1px solid rgba(127,127,127,.2)}
      .fc-visibility-status{margin-top:12px;min-height:20px;color:#ff8b8b}.fc-visibility-public{color:var(--purple,#8b7cff);font-weight:750}
      @media(max-width:700px){.fc-visibility-grid{grid-template-columns:1fr}.fc-visibility-field.full{grid-column:auto}.fc-visibility-head,.fc-visibility-body,.fc-visibility-footer{padding-left:16px;padding-right:16px}}
    `;
    document.head.appendChild(style);
  }

  function openEditor({ set = null, cards = null, title = '', subject = '', description = '' } = {}) {
    style();
    document.getElementById('fc-visibility-modal')?.remove();

    const initialCards = normalizeCards(cards || set?.cards || [['', '']]);
    const editing = Boolean(set?.id);

    const modal = document.createElement('div');
    modal.id = 'fc-visibility-modal';
    modal.className = 'fc-visibility-modal';
    modal.innerHTML = `
      <div class="fc-visibility-card" role="dialog" aria-modal="true">
        <div class="fc-visibility-head">
          <div>
            <h2>${editing ? 'Edit Flashcard Set' : 'Create Flashcard Set'}</h2>
            <p>${editing ? 'Choose whether to keep this set private or publish it to the EcE Hub community.' : 'Your set is private by default. Public sets become discoverable by other EcE Hub students.'}</p>
          </div>
          <button type="button" class="fc-visibility-close" data-fc-close aria-label="Close">×</button>
        </div>
        <div class="fc-visibility-body">
          <div class="fc-visibility-grid">
            <label class="fc-visibility-field">
              <span class="fc-visibility-label">Title</span>
              <input id="fc-title" maxlength="120" value="${esc(set?.title || title)}" placeholder="e.g. Digital Logic Chapter 1">
            </label>
            <label class="fc-visibility-field">
              <span class="fc-visibility-label">Subject / Class</span>
              <input id="fc-subject" maxlength="120" value="${esc(set?.subject || subject)}" placeholder="e.g. Digital Electronics">
            </label>
            <label class="fc-visibility-field full">
              <span class="fc-visibility-label">Description</span>
              <textarea id="fc-description" maxlength="1000" rows="3" placeholder="What is this set about?">${esc(set?.description || description)}</textarea>
            </label>
            <label class="fc-visibility-field full">
              <span class="fc-visibility-label">Visibility</span>
              <select id="fc-visibility">
                <option value="private" selected>Private — only you can access it</option>
                <option value="public">Public — searchable and available to EcE Hub students</option>
              </select>
              <span class="fc-visibility-help">Public sets appear in Classes, Explore/Search, and community profiles. Private sets stay in your local/private workspace.</span>
            </label>
          </div>

          <div class="fc-visibility-cards" id="fc-card-list">
            ${initialCards.map((card, index) => cardRow(card, index)).join('')}
          </div>
          <button type="button" class="btn" data-fc-add-card style="margin-top:12px">+ Add Card</button>
          <div class="fc-visibility-status" id="fc-status"></div>
        </div>
        <div class="fc-visibility-footer">
          <button type="button" class="btn" data-fc-close>Cancel</button>
          <button type="button" class="btn primary" data-fc-save>${editing ? 'Save Changes' : 'Create Set'}</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelectorAll('[data-fc-close]').forEach(button => button.addEventListener('click', close));
    modal.addEventListener('click', event => { if (event.target === modal) close(); });

    modal.querySelector('[data-fc-add-card]')?.addEventListener('click', () => {
      const container = modal.querySelector('#fc-card-list');
      const index = container.querySelectorAll('.fc-visibility-card-row').length;
      container.insertAdjacentHTML('beforeend', cardRow(['', ''], index));
      container.lastElementChild?.querySelector('.fc-question')?.focus();
    });

    modal.addEventListener('click', event => {
      const remove = event.target.closest('[data-fc-remove-card]');
      if (!remove) return;
      const container = modal.querySelector('#fc-card-list');
      if (container.querySelectorAll('.fc-visibility-card-row').length <= 1) return;
      remove.closest('.fc-visibility-card-row')?.remove();
    });

    modal.querySelector('[data-fc-save]')?.addEventListener('click', async () => {
      const status = modal.querySelector('#fc-status');
      const button = modal.querySelector('[data-fc-save]');
      const nextTitle = text(modal.querySelector('#fc-title')?.value);
      const nextSubject = text(modal.querySelector('#fc-subject')?.value);
      const nextDescription = text(modal.querySelector('#fc-description')?.value);
      const visibility = modal.querySelector('#fc-visibility')?.value === 'public' ? 'public' : 'private';
      const nextCards = [...modal.querySelectorAll('.fc-visibility-card-row')]
        .map(row => [text(row.querySelector('.fc-question')?.value), text(row.querySelector('.fc-answer')?.value)]);

      if (!nextTitle) { status.textContent = 'Please enter a title.'; return; }
      if (!nextSubject) { status.textContent = 'Please enter a subject/class.'; return; }
      if (!nextCards.length || nextCards.some(card => !card[0] || !card[1])) {
        status.textContent = 'Every flashcard needs both a question and an answer.';
        return;
      }

      button.disabled = true;
      button.textContent = visibility === 'public' ? 'Publishing…' : 'Saving…';
      status.textContent = '';

      try {
        if (visibility === 'public') {
          const result = editing
            ? await request(`/api/flashcards/${encodeURIComponent(set.id)}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  title: nextTitle,
                  subject: nextSubject,
                  description: nextDescription,
                  visibility: 'public',
                  cards: nextCards.map(([question, answer]) => ({ question, answer }))
                })
              })
            : await request('/api/flashcards', {
                method: 'POST',
                body: JSON.stringify({
                  title: nextTitle,
                  subject: nextSubject,
                  description: nextDescription,
                  visibility: 'public',
                  cards: nextCards.map(([question, answer]) => ({ question, answer }))
                })
              });

          if (editing) {
            const local = readLocal();
            local.sets = Array.isArray(local.sets) ? local.sets.filter(item => item.id !== set.id) : [];
            writeLocal(local);
          }

          close();
          document.dispatchEvent(new CustomEvent('ecehub:community-flashcard-updated', { detail: { set: result?.set || null } }));
          document.dispatchEvent(new CustomEvent('ecehub:community-workspace-refresh'));
          if (typeof window.render === 'function') window.render();
          if (typeof window.toast === 'function') window.toast(editing ? 'Flashcard set published to the community.' : 'Flashcard set published.');
          return;
        }

        const local = readLocal();
        local.sets = Array.isArray(local.sets) ? local.sets : [];
        const localSet = {
          id: set?.id || `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: nextTitle,
          subject: nextSubject,
          description: nextDescription,
          cards: nextCards
        };
        const index = local.sets.findIndex(item => item.id === localSet.id);
        if (index >= 0) local.sets[index] = localSet;
        else local.sets.push(localSet);
        writeLocal(local);

        close();
        if (typeof window.render === 'function') window.render();
        if (typeof window.toast === 'function') window.toast(editing ? 'Private flashcard set updated.' : 'Private flashcard set created.');
      } catch (error) {
        console.error('Flashcard visibility save failed:', error);
        status.textContent = error?.data?.error || error?.message || 'Could not save this flashcard set.';
        button.disabled = false;
        button.textContent = editing ? 'Save Changes' : 'Create Set';
      }
    });

    modal.querySelector('#fc-title')?.focus();
  }

  function cardRow(card, index) {
    return `
      <div class="fc-visibility-card-row">
        <div class="fc-visibility-card-row-head">
          <strong>Flashcard ${index + 1}</strong>
          <button type="button" class="btn danger" data-fc-remove-card>Remove</button>
        </div>
        <textarea class="fc-question" rows="2" maxlength="2000" placeholder="Question">${esc(card[0])}</textarea>
        <textarea class="fc-answer" rows="3" maxlength="4000" placeholder="Answer">${esc(card[1])}</textarea>
      </div>`;
  }

  function openFromLocal(id) {
    const data = readLocal();
    const set = (Array.isArray(data.sets) ? data.sets : []).find(item => item.id === id);
    if (!set) {
      if (typeof window.toast === 'function') window.toast('Private flashcard set not found.');
      return;
    }
    openEditor({ set });
  }

  function install() {
    style();

    document.addEventListener('click', event => {
      const add = event.target.closest('[data-action="add-set"]');
      const edit = event.target.closest('[data-action="edit-set"]');
      const previewSave = event.target.closest('[data-preview-action="save"]');

      if (add) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openEditor();
        return;
      }

      if (edit) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openFromLocal(edit.dataset.id || '');
        return;
      }

      if (previewSave) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const modal = previewSave.closest('.ai-flashcard-modal');
        if (!modal) return;
        const cards = [...modal.querySelectorAll('.ai-preview-card')].map(card => [
          text(card.querySelector('.ai-preview-question')?.value),
          text(card.querySelector('.ai-preview-answer')?.value)
        ]);
        const title = text(modal.querySelector('.modal-header p')?.textContent);
        modal.remove();
        document.body.style.overflow = '';
        openEditor({ title, subject: 'AI Generated', description: 'AI-generated flashcards.', cards });
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  console.log('EcE Hub flashcard public/private creation bridge installed.');
})();
