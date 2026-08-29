/* EcE Hub — persistent People search */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const state = { query: '', users: [], request: 0, timer: 0 };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const text = value => String(value ?? '').trim();

  async function fetchUsers(query, request) {
    try {
      const token = (() => {
        try {
          return localStorage.getItem('ecehub_community_session')
            || localStorage.getItem('ecehub_session_token')
            || '';
        } catch { return ''; }
      })();

      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(
        `${API}/api/search?q=${encodeURIComponent(query)}`,
        { credentials: 'include', headers }
      );

      if (!response.ok) throw new Error(`People search failed (${response.status})`);
      const result = await response.json();
      if (request !== state.request) return;

      const seen = new Set();
      state.users = (Array.isArray(result?.users) ? result.users : []).filter(user => {
        const key = String(user?.id || user?.username || '').toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      renderPeople();
    } catch (error) {
      if (request === state.request) {
        state.users = [];
        console.warn('Persistent People search failed:', error);
      }
    }
  }

  function userRow(user) {
    const id = esc(user.id || '');
    const username = esc(user.username || '');
    const name = esc(user.displayName || user.username || 'Community member');
    const avatar = user.avatarUrl
      ? `<img src="${esc(user.avatarUrl)}" alt="" loading="lazy">`
      : '◉';

    return `<button type="button" class="global-search-row" data-action="view-community-user" data-id="${id}" data-username="${username}"><span class="global-search-row-icon users">${avatar}</span><span class="global-search-row-copy"><strong>${name}</strong><small>@${username}</small></span><span class="global-search-row-type">People</span></button>`;
  }

  function userCard(user) {
    const id = esc(user.id || '');
    const username = esc(user.username || '');
    const name = esc(user.displayName || user.username || 'Community member');
    const bio = text(user.bio || '');
    const avatar = user.avatarUrl
      ? `<img src="${esc(user.avatarUrl)}" alt="" loading="lazy">`
      : '◉';

    return `<article class="global-search-card card"><button type="button" class="global-search-card-hit" data-action="view-community-user" data-id="${id}" data-username="${username}"><div class="global-search-card-top"><span class="global-search-card-icon users">${avatar}</span><span class="global-search-card-kind">People</span></div><h3>${name}</h3><div class="global-search-card-meta">@${username}</div>${bio ? `<p>${esc(bio.slice(0,180))}${bio.length>180?'…':''}</p>` : ''}</button></article>`;
  }

  function renderPeople() {
    const input = document.getElementById('globalSearch');
    const panel = document.getElementById('searchResults');
    const content = document.getElementById('content');
    const query = state.query;
    if (!input || !panel || !content || !query) return;

    const users = state.users;
    const page = content.querySelector('.global-search-page');

    /* Full search page. The observer below calls this again whenever
       search-fix.js replaces #content. */
    if (page && users.length && !page.querySelector('.community-persistent-people')) {
      const filters = page.querySelector('.global-search-filters');
      const section = document.createElement('section');
      section.className = 'global-search-section community-persistent-people';
      section.dataset.searchSection = 'users';
      section.innerHTML = `<div class="global-search-section-head"><div><span class="global-search-section-icon">◉</span><h2>People</h2></div><span>${users.length}</span></div><div class="global-search-results-grid">${users.slice(0,12).map(userCard).join('')}</div>`;
      if (filters) filters.insertAdjacentElement('afterend', section);
      else page.appendChild(section);
      page.querySelector('.global-search-empty')?.remove();
    }

    /* Search dropdown. Re-add it if search-fix.js redraws the panel. */
    if (users.length && !panel.querySelector('.community-persistent-people')) {
      const group = document.createElement('div');
      group.className = 'global-search-group community-persistent-people';
      group.innerHTML = `<div class="global-search-group-title">People</div>${users.slice(0,5).map(userRow).join('')}`;
      panel.insertAdjacentElement('afterbegin', group);
      panel.hidden = false;
    }
  }

  function install() {
    const input = document.getElementById('globalSearch');
    if (!input || input.dataset.persistentPeopleFix === '1') return;
    input.dataset.persistentPeopleFix = '1';

    input.addEventListener('input', () => {
      state.query = text(input.value).toLocaleLowerCase();
      state.request += 1;
      const request = state.request;
      clearTimeout(state.timer);
      state.users = [];
      if (!state.query) return;
      state.timer = setTimeout(() => fetchUsers(state.query, request), 45);
    });

    const observer = new MutationObserver(() => {
      if (state.query && state.users.length) renderPeople();
    });

    const content = document.getElementById('content');
    const panel = document.getElementById('searchResults');
    if (content) observer.observe(content, { childList: true, subtree: true });
    if (panel) observer.observe(panel, { childList: true, subtree: true });

    console.log('EcE Hub persistent People search installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  setTimeout(install, 300);
})();
