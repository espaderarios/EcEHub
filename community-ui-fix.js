/* EcE Hub — Community search + flashcard edit fixes */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  let searchSequence = 0;
  let searchTimer = 0;

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const text = value => String(value ?? '').trim();

  function getToken() {
    try {
      return localStorage.getItem('ecehub_community_session')
        || localStorage.getItem('ecehub_session_token')
        || '';
    } catch {
      return '';
    }
  }

  async function communityRequest(path, options = {}) {
    if (typeof window.communityFetch === 'function') {
      return window.communityFetch(path, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers
    });

    let data = {};
    try { data = await response.json(); } catch {}

    if (!response.ok) {
      const error = new Error(data?.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function searchPeople(query, sequence) {
    const q = text(query);
    if (!q) return;

    try {
      const result = await communityRequest(`/api/search?q=${encodeURIComponent(q)}`);
      if (sequence !== searchSequence) return;
      const users = Array.isArray(result?.users) ? result.users : [];
      injectPeopleResults(users, q);
    } catch (error) {
      if (sequence !== searchSequence) return;
      console.warn('Community People search failed:', error);
    }
  }

  function userRow(user) {
    const id = esc(user.id || '');
    const username = esc(user.username || '');
    const displayName = esc(user.displayName || user.username || 'Community member');
    const avatar = user.avatarUrl ? `<img src="${esc(user.avatarUrl)}" alt="" loading="lazy">` : '◉';
    return `<button type="button" class="global-search-row" data-action="view-community-user" data-id="${id}" data-username="${username}">
      <span class="global-search-row-icon users">${avatar}</span>
      <span class="global-search-row-copy"><strong>${displayName}</strong><small>@${username}</small></span>
      <span class="global-search-row-type">People</span>
    </button>`;
  }

  function userCard(user) {
    const id = esc(user.id || '');
    const username = esc(user.username || '');
    const displayName = esc(user.displayName || user.username || 'Community member');
    const bio = text(user.bio || '');
    const avatar = user.avatarUrl ? `<img src="${esc(user.avatarUrl)}" alt="" loading="lazy">` : '◉';
    return `<article class="global-search-card card">
      <button type="button" class="global-search-card-hit" data-action="view-community-user" data-id="${id}" data-username="${username}">
        <div class="global-search-card-top"><span class="global-search-card-icon users">${avatar}</span><span class="global-search-card-kind">People</span></div>
        <h3>${displayName}</h3>
        <div class="global-search-card-meta">@${username}</div>
        ${bio ? `<p>${esc(bio.slice(0, 180))}${bio.length > 180 ? '…' : ''}</p>` : ''}
      </button>
    </article>`;
  }

  function injectPeopleResults(users, query) {
    const panel = document.getElementById('searchResults');
    const content = document.getElementById('content');
    if (!panel || !content) return;

    const cleanUsers = [];
    const seen = new Set();
    for (const user of users) {
      const key = String(user.id || user.username || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cleanUsers.push(user);
    }

    if (cleanUsers.length) {
      const existingGroup = panel.querySelector('.community-ui-people-group');
      const html = `<div class="global-search-group community-ui-people-group"><div class="global-search-group-title">People</div>${cleanUsers.slice(0, 5).map(userRow).join('')}</div>`;
      if (existingGroup) existingGroup.outerHTML = html;
      else panel.insertAdjacentHTML('afterbegin', html);
      panel.hidden = false;
    }

    const page = content.querySelector('.global-search-page');
    if (!page) return;
    const filters = page.querySelector('.global-search-filters');
    let section = page.querySelector('[data-search-section="users"]');

    if (!cleanUsers.length) {
      if (section) section.remove();
      return;
    }

    const sectionHtml = `<section class="global-search-section community-ui-people-section" data-search-section="users"><div class="global-search-section-head"><div><span class="global-search-section-icon">◉</span><h2>People</h2></div><span>${cleanUsers.length}</span></div><div class="global-search-results-grid">${cleanUsers.slice(0, 12).map(userCard).join('')}</div></section>`;
    if (section) section.outerHTML = sectionHtml;
    else if (filters) filters.insertAdjacentHTML('afterend', sectionHtml);
    else page.insertAdjacentHTML('beforeend', sectionHtml);
    page.querySelector('.global-search-empty')?.remove();
  }

  function installPeopleSearch() {
    const input = document.getElementById('globalSearch');
    if (!input || input.dataset.peopleSearchFixInstalled === '1') return;
    input.dataset.peopleSearchFixInstalled = '1';
    input.addEventListener('input', () => {
      const query = text(input.value);
      const sequence = ++searchSequence;
      clearTimeout(searchTimer);
      if (!query) return;
      searchTimer = setTimeout(() => searchPeople(query, sequence), 60);
    });
  }

  function normalizeCards(set) {
    if (!Array.isArray(set?.cards)) return [];
    return set.cards.map(card => ({ question: text(card?.question), answer: text(card?.answer) }));
  }

  function cardEditor(card, index) {
    return `<div class="community-edit-card" data-card-index="${index}">
      <div class="community-edit-card-head"><strong>Card ${index + 1}</strong><button type="button" class="btn danger community-edit-remove-card">Remove</button></div>
      <label>Question<textarea class="community-edit-question" rows="2" maxlength="2000">${esc(card.question)}</textarea></label>
      <label>Answer<textarea class="community-edit-answer" rows="3" maxlength="4000">${esc(card.answer)}</textarea></label>
    </div>`;
  }

  function injectModalStyles() {
    if (document.getElementById('community-edit-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'community-edit-modal-styles';
    style.textContent = `
      .community-edit-modal-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:20px}
      .community-edit-modal{width:min(900px,96vw);max-height:92vh;overflow:hidden;background:var(--card,#fff);color:inherit;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.28);display:flex;flex-direction:column}
      .community-edit-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 24px;border-bottom:1px solid rgba(127,127,127,.18)}
      .community-edit-modal-header h2{margin:0 0 5px}.community-edit-modal-header p{margin:0;opacity:.7}.community-edit-modal-close{border:0;background:transparent;font-size:28px;cursor:pointer;padding:0 4px;color:inherit}
      .community-edit-modal-body{padding:22px 24px;overflow:auto}.community-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.community-edit-field{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}.community-edit-field.full{grid-column:1/-1}.community-edit-field label{font-weight:700}
      .community-edit-field input,.community-edit-field textarea,.community-edit-field select{width:100%;box-sizing:border-box;border:1px solid rgba(127,127,127,.3);border-radius:10px;padding:10px 12px;background:transparent;color:inherit;font:inherit}
      .community-edit-cards{display:flex;flex-direction:column;gap:12px;margin-top:18px}.community-edit-card{border:1px solid rgba(127,127,127,.22);border-radius:14px;padding:14px;background:rgba(127,127,127,.035)}.community-edit-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.community-edit-card label{display:flex;flex-direction:column;gap:6px;margin-top:10px;font-weight:600}.community-edit-card textarea{width:100%;box-sizing:border-box;border:1px solid rgba(127,127,127,.3);border-radius:9px;padding:9px;background:transparent;color:inherit;font:inherit}.community-edit-add-card{margin-top:12px}.community-edit-modal-footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid rgba(127,127,127,.18)}.community-edit-status{margin-top:12px;min-height:20px;color:#b42318}
      @media(max-width:700px){.community-edit-grid{grid-template-columns:1fr}.community-edit-field.full{grid-column:auto}.community-edit-modal{max-height:96vh}.community-edit-modal-header,.community-edit-modal-body,.community-edit-modal-footer{padding-left:16px;padding-right:16px}}
    `;
    document.head.appendChild(style);
  }

  function renumberEditCards(container) {
    container.querySelectorAll('.community-edit-card').forEach((card, index) => {
      const label = card.querySelector('.community-edit-card-head strong');
      if (label) label.textContent = `Card ${index + 1}`;
      card.dataset.cardIndex = String(index);
    });
  }

  async function openCommunitySetEditModal(setId) {
    injectModalStyles();
    const existing = document.getElementById('community-edit-modal-backdrop');
    if (existing) existing.remove();

    let set;
    try {
      set = typeof window.getFlashcardSet === 'function'
        ? await window.getFlashcardSet(setId)
        : (await communityRequest(`/api/flashcards/${encodeURIComponent(setId)}`))?.set;
    } catch (error) {
      console.error('Failed to load community flashcard set:', error);
      if (typeof window.toast === 'function') window.toast(error.message || 'Could not load flashcard set.');
      return;
    }

    if (!set) {
      if (typeof window.toast === 'function') window.toast('Flashcard set not found.');
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'community-edit-modal-backdrop';
    backdrop.className = 'community-edit-modal-backdrop';
    const cards = normalizeCards(set);

    backdrop.innerHTML = `
      <div class="community-edit-modal" role="dialog" aria-modal="true" aria-labelledby="community-edit-title">
        <div class="community-edit-modal-header"><div><h2 id="community-edit-title">Edit community flashcards</h2><p>Update the set, cards, and whether other students can discover it.</p></div><button type="button" class="community-edit-modal-close" data-community-edit-close aria-label="Close">×</button></div>
        <div class="community-edit-modal-body">
          <div class="community-edit-grid">
            <div class="community-edit-field"><label for="community-edit-title-input">Title</label><input id="community-edit-title-input" maxlength="120" value="${esc(set.title)}"></div>
            <div class="community-edit-field"><label for="community-edit-subject-input">Subject</label><input id="community-edit-subject-input" maxlength="120" value="${esc(set.subject)}"></div>
            <div class="community-edit-field full"><label for="community-edit-description-input">Description</label><textarea id="community-edit-description-input" maxlength="1000" rows="3">${esc(set.description)}</textarea></div>
            <div class="community-edit-field"><label for="community-edit-visibility-input">Visibility</label><select id="community-edit-visibility-input"><option value="public" ${set.visibility === 'public' ? 'selected' : ''}>Public — searchable by everyone</option><option value="private" ${set.visibility === 'private' ? 'selected' : ''}>Private — only you can access it</option></select></div>
          </div>
          <div class="community-edit-cards" id="community-edit-cards">${cards.map(cardEditor).join('')}</div>
          <button type="button" class="btn community-edit-add-card" data-community-edit-add-card>+ Add card</button>
          <div class="community-edit-status" id="community-edit-status" role="status"></div>
        </div>
        <div class="community-edit-modal-footer"><button type="button" class="btn" data-community-edit-close>Cancel</button><button type="button" class="btn primary" data-community-edit-save>Save changes</button></div>
      </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-community-edit-close]').forEach(button => button.addEventListener('click', close));
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });

    backdrop.querySelector('[data-community-edit-add-card]')?.addEventListener('click', () => {
      const container = backdrop.querySelector('#community-edit-cards');
      const index = container.querySelectorAll('.community-edit-card').length;
      container.insertAdjacentHTML('beforeend', cardEditor({ question: '', answer: '' }, index));
      renumberEditCards(container);
      container.lastElementChild?.querySelector('.community-edit-question')?.focus();
    });

    backdrop.addEventListener('click', event => {
      const remove = event.target.closest('.community-edit-remove-card');
      if (!remove) return;
      const container = backdrop.querySelector('#community-edit-cards');
      const card = remove.closest('.community-edit-card');
      if (container.querySelectorAll('.community-edit-card').length <= 1) {
        const status = backdrop.querySelector('#community-edit-status');
        status.textContent = 'Keep at least one flashcard.';
        return;
      }
      card?.remove();
      renumberEditCards(container);
    });

    backdrop.querySelector('[data-community-edit-save]')?.addEventListener('click', async () => {
      const button = backdrop.querySelector('[data-community-edit-save]');
      const status = backdrop.querySelector('#community-edit-status');
      const title = text(backdrop.querySelector('#community-edit-title-input')?.value);
      const subject = text(backdrop.querySelector('#community-edit-subject-input')?.value);
      const description = text(backdrop.querySelector('#community-edit-description-input')?.value);
      const visibility = backdrop.querySelector('#community-edit-visibility-input')?.value === 'private' ? 'private' : 'public';

      if (!title) { status.textContent = 'Please enter a title.'; return; }

      const updatedCards = [...backdrop.querySelectorAll('.community-edit-card')].map(card => ({
        question: text(card.querySelector('.community-edit-question')?.value),
        answer: text(card.querySelector('.community-edit-answer')?.value)
      }));

      if (!updatedCards.length) { status.textContent = 'Add at least one flashcard.'; return; }
      const invalid = updatedCards.findIndex(card => !card.question || !card.answer);
      if (invalid !== -1) { status.textContent = `Card ${invalid + 1} needs both a question and an answer.`; return; }

      button.disabled = true;
      button.textContent = 'Saving…';
      status.textContent = '';

      try {
        const result = await communityRequest(`/api/flashcards/${encodeURIComponent(setId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, subject, description, visibility, cards: updatedCards })
        });

        close();

        /*
         * Do not call the application's global render() here.
         * The main app's flashcardsView intentionally renders only the
         * Flashcards header/AI Maker; community-workspace.js owns the
         * actual Flashcards workspace cards. Calling render() removes
         * that workspace, and the asynchronous workspace refresh can
         * race the app render and leave the page empty.
         *
         * Instead, notify the workspace and let it refresh its own DOM.
         */
        document.dispatchEvent(new CustomEvent('ecehub:community-flashcard-updated', {
          detail: { set: result?.set || null }
        }));

        if (typeof window.toast === 'function') window.toast('Community flashcard set updated.');
      } catch (error) {
        console.error('Failed to update community flashcard set:', error);
        status.textContent = error?.message || 'Could not save changes.';
        button.disabled = false;
        button.textContent = 'Save changes';
      }
    });

    backdrop.querySelector('#community-edit-title-input')?.focus();
  }

  function installEditHandler() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-action="edit-community-set"]');
      if (!button) return;
      const setId = button.dataset.id;
      if (!setId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openCommunitySetEditModal(setId);
    }, true);
  }

  function install() {
    installPeopleSearch();
    installEditHandler();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  setTimeout(install, 250);
})();