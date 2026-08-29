/* EcE Hub — community search polish
 * Keeps People results in sync with the main search page without creating
 * duplicate sections or mutation-observer loops.
 */
(() => {
  'use strict';

  const state = { lastQuery: '', request: 0, timer: 0 };
  const text = value => String(value ?? '').trim();
  const lower = value => text(value).toLocaleLowerCase();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getUsers(query) {
    const users = [];
    const seen = new Set();
    const list = window.__ecehubCommunitySearchUsers;
    if (!Array.isArray(list)) return users;

    for (const user of list) {
      const id = text(user?.id);
      const username = text(user?.username);
      const name = text(user?.displayName || user?.name || username);
      const key = lower(id || username || name);
      if (!key || seen.has(key)) continue;
      if (!lower(`${username} ${name}`).includes(query)) continue;
      seen.add(key);
      users.push(user);
    }

    return users;
  }

  function refreshSummary(page, total, query) {
    const summary = page.querySelector('.global-search-page-header p');
    if (!summary) return;
    const value = `${total} result${total === 1 ? '' : 's'} for <strong>“${escapeHtml(query)}”</strong>`;
    if (summary.innerHTML !== value) summary.innerHTML = value;
  }

  function refreshSearchPage(query) {
    const page = document.querySelector('.global-search-page');
    if (!page || !query) return;

    // This marker prevents the MutationObserver from repeatedly rewriting
    // the same search page after our own DOM changes.
    if (page.dataset.communitySearchPolishQuery === query &&
        (page.querySelector('.community-search-polished-people') ||
         page.dataset.communitySearchPolishEmpty === '1')) {
      return;
    }

    const sections = [...page.querySelectorAll('[data-search-section]')]
      .filter(section => !section.classList.contains('community-persistent-people'));

    page.querySelectorAll('.community-persistent-people').forEach(section => section.remove());

    const users = getUsers(query);

    if (users.length) {
      const section = document.createElement('section');
      section.className = 'global-search-section community-persistent-people community-search-polished-people';
      section.dataset.searchSection = 'users';
      section.innerHTML = `
        <div class="global-search-section-head">
          <div>
            <span class="global-search-section-icon">◉</span>
            <h2>People</h2>
          </div>
          <span>${users.length}</span>
        </div>
        <div class="global-search-results-grid">
          ${users.slice(0, 12).map(user => {
            const id = escapeHtml(user?.id || '');
            const username = escapeHtml(user?.username || '');
            const name = escapeHtml(user?.displayName || user?.name || user?.username || 'Community member');
            const bio = text(user?.bio || '');
            const avatar = user?.avatarUrl
              ? `<img src="${escapeHtml(user.avatarUrl)}" alt="" loading="lazy">`
              : '◉';
            return `
              <article class="global-search-card card">
                <button type="button" class="global-search-card-hit"
                  data-action="view-community-user"
                  data-id="${id}"
                  data-username="${username}">
                  <div class="global-search-card-top">
                    <span class="global-search-card-icon users">${avatar}</span>
                    <span class="global-search-card-kind">People</span>
                  </div>
                  <h3>${name}</h3>
                  <div class="global-search-card-meta">@${username}</div>
                  ${bio ? `<p>${escapeHtml(bio.slice(0, 180))}${bio.length > 180 ? '…' : ''}</p>` : ''}
                </button>
              </article>`;
          }).join('')}
        </div>`;

      const filters = page.querySelector('.global-search-filters');
      if (filters) filters.insertAdjacentElement('afterend', section);
      else page.appendChild(section);

      page.querySelector('.global-search-empty')?.remove();
      page.dataset.communitySearchPolishEmpty = '0';
    } else {
      page.dataset.communitySearchPolishEmpty = '1';
    }

    const total = [...sections]
      .reduce((sum, section) => sum + section.querySelectorAll('.global-search-card').length, 0)
      + users.length;

    page.dataset.communitySearchPolishQuery = query;
    refreshSummary(page, total, query);
  }

  async function fetchUsers(query, requestId) {
    try {
      const result = typeof window.communityFetch === 'function'
        ? await window.communityFetch(`/api/search?q=${encodeURIComponent(query)}`)
        : await fetch(`https://ecehub-community.ecehub-ai-backend.workers.dev/api/search?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
          }).then(response => response.json());

      if (requestId !== state.request || state.lastQuery !== query) return;

      window.__ecehubCommunitySearchUsers = Array.isArray(result?.users)
        ? result.users
        : [];

      refreshSearchPage(query);
    } catch (error) {
      if (requestId === state.request) {
        console.warn('Community People search unavailable:', error);
      }
    }
  }

  function install() {
    const input = document.getElementById('globalSearch');
    const content = document.getElementById('content');
    if (!input || !content || input.dataset.communitySearchPolish === '1') return;

    input.dataset.communitySearchPolish = '1';

    input.addEventListener('input', () => {
      const query = lower(input.value);
      state.lastQuery = query;
      state.request += 1;
      const requestId = state.request;
      clearTimeout(state.timer);

      if (!query) {
        window.__ecehubCommunitySearchUsers = [];
        return;
      }

      state.timer = setTimeout(() => fetchUsers(query, requestId), 80);
    });

    const observer = new MutationObserver(() => {
      if (state.lastQuery) refreshSearchPage(state.lastQuery);
    });

    observer.observe(content, { childList: true, subtree: true });
    console.log('EcE Hub community search polish installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  setTimeout(install, 250);
})();
