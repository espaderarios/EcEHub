/* EcE Hub Home — Community Flashcards */
(function installHomeCommunityFlashcards() {
  const SECTION_ID = 'homeCommunityFlashcards';
  const MAX_SETS = 6;
  let refreshQueued = false;
  let refreshing = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isHome() {
    const homeNav = document.querySelector('.nav-item[data-route="home"].active');
    const content = document.getElementById('content');
    if (!homeNav || !content) return false;

    /* Never inject this section into the global search results page.
       Search lives while Home remains the active navigation route. */
    if (content.querySelector('.global-search-page')) return false;

    /* A real Home view contains the home grid. */
    return Boolean(content.querySelector('.home-grid'));
  }

  function getContainer() {
    return document.querySelector('#content');
  }

  function renderLoading() {
    return `
      <section class="home-community-section" id="${SECTION_ID}">
        <div class="section-head home-community-head">
          <div>
            <h2>Community Flashcards</h2>
            <p class="home-community-subtitle">Community-made study sets</p>
          </div>
          <button type="button" class="btn" data-route="flashcards">View all</button>
        </div>
        <div class="home-community-grid">
          ${Array.from({ length: 3 }, () => `
            <div class="home-community-card skeleton-card" aria-hidden="true">
              <div class="skeleton skeleton-icon"></div>
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton skeleton-line"></div>
              <div class="skeleton skeleton-line short"></div>
            </div>
          `).join('')}
        </div>
      </section>`;
  }

  function renderEmpty() {
    return `
      <section class="home-community-section" id="${SECTION_ID}">
        <div class="section-head home-community-head">
          <div>
            <h2>Community Flashcards</h2>
            <p class="home-community-subtitle">Study sets shared by the EcE Hub community</p>
          </div>
          <button type="button" class="btn" data-route="flashcards">Explore</button>
        </div>
        <div class="home-community-empty card">
          <div class="home-community-empty-icon">▧</div>
          <div>
            <strong>No community flashcard sets yet</strong>
            <p>Explore the community and add useful sets to your workspace.</p>
          </div>
          <button type="button" class="btn primary" data-route="flashcards">Explore flashcards</button>
        </div>
      </section>`;
  }

  function isPublicSet(set) {
    const visibility = String(
      set?.visibility ?? set?.setVisibility ?? set?.visibility_status ?? ''
    ).trim().toLowerCase();

    /* The public community endpoint normally omits visibility. Treat an
       omitted value as public, but never render an explicitly private set. */
    return visibility !== 'private' && visibility !== 'priv' && visibility !== 'false';
  }

  function renderSets(sets) {
    const visible = (Array.isArray(sets) ? sets : [])
      .filter(isPublicSet)
      .filter(set => set?.id)
      .slice(0, MAX_SETS);

    if (!visible.length) return renderEmpty();

    return `
      <section class="home-community-section" id="${SECTION_ID}">
        <div class="section-head home-community-head">
          <div>
            <h2>Community Flashcards</h2>
            <p class="home-community-subtitle">Study sets shared by the EcE Hub community</p>
          </div>
          <button type="button" class="btn" data-route="flashcards">View all</button>
        </div>

        <div class="home-community-grid">
          ${visible.map((set, index) => {
            const title = escapeHtml(set?.title || 'Untitled set');
            const subject = escapeHtml(set?.subject || 'General');
            const cards = Array.isArray(set?.cards)
              ? set.cards.length
              : Number(set?.cardCount ?? set?.card_count ?? 0);
            const author = escapeHtml(
              set?.authorUsername ||
              set?.author_username ||
              set?.username ||
              set?.authorName ||
              'Community'
            );
            const id = escapeHtml(set?.id || '');

            return `
              <article class="home-community-card card" style="--community-index:${index}">
                <div class="home-community-card-top">
                  <div class="home-community-card-icon">▧</div>
                  <span class="home-community-badge">Community</span>
                </div>

                <button
                  type="button"
                  class="home-community-title"
                  data-action="view-community-set"
                  data-id="${id}"
                >${title}</button>

                <div class="home-community-subject">${subject}</div>

                <div class="home-community-meta">
                  <span>${cards} card${cards === 1 ? '' : 's'}</span>
                  <span>•</span>
                  <span>by ${author}</span>
                </div>

                <div class="home-community-actions">
                  <button
                    type="button"
                    class="btn primary"
                    data-action="study-community-set"
                    data-id="${id}"
                  >Study</button>
                  <button
                    type="button"
                    class="btn"
                    data-action="add-community-set"
                    data-id="${id}"
                  >+ Workspace</button>
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;
  }

  function removeSection() {
    document.getElementById(SECTION_ID)?.remove();
  }

  function replaceSection(html) {
    if (!isHome()) return;

    const existing = document.getElementById(SECTION_ID);
    if (existing) {
      existing.outerHTML = html;
      return;
    }

    const container = getContainer();
    if (!container || !isHome()) return;

    const homeGrid = container.querySelector('.home-grid');
    if (homeGrid) {
      homeGrid.insertAdjacentHTML('beforebegin', html);
    }
  }

  async function refresh() {
    if (refreshing || !isHome()) return;
    refreshing = true;

    replaceSection(renderLoading());

    try {
      let sets = [];

      if (typeof window.loadCommunityFlashcards === 'function') {
        sets = await window.loadCommunityFlashcards();
      } else {
        const token = (() => {
          try {
            return localStorage.getItem('ecehub_community_session')
              || localStorage.getItem('ecehub_session_token')
              || '';
          } catch {
            return '';
          }
        })();

        const response = await fetch(
          'https://ecehub-community.ecehub-ai-backend.workers.dev/api/flashcards?limit=50',
          {
            credentials: 'include',
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {}
          }
        );

        const data = await response.json();
        sets = data?.sets || data?.flashcards || data?.data || [];
      }

      /* Navigation/search may have changed while the request was running. */
      if (isHome()) {
        replaceSection(renderSets(sets));
      } else {
        removeSection();
      }
    } catch (error) {
      console.error('Home community flashcards failed:', error);
      if (isHome()) {
        replaceSection(`
          <section class="home-community-section" id="${SECTION_ID}">
            <div class="section-head home-community-head">
              <div>
                <h2>Community Flashcards</h2>
                <p class="home-community-subtitle">Study sets shared by the EcE Hub community</p>
              </div>
            </div>
            <div class="home-community-empty card">
              <div class="home-community-empty-icon">!</div>
              <div>
                <strong>Could not load community flashcards</strong>
                <p>Please try again from the Flashcards page.</p>
              </div>
              <button type="button" class="btn" data-route="flashcards">Open flashcards</button>
            </div>
          </section>`);
      } else {
        removeSection();
      }
    } finally {
      refreshing = false;
    }
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;

    requestAnimationFrame(() => {
      refreshQueued = false;

      if (!isHome()) {
        removeSection();
        return;
      }

      if (!document.getElementById(SECTION_ID)) {
        refresh();
      }
    });
  }

  function installRouteButtons() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-route="flashcards"]');
      if (!button) return;

      if (typeof window.go === 'function') {
        event.preventDefault();
        window.go('flashcards');
      }
    });
  }

  installRouteButtons();

  const observer = new MutationObserver(() => {
    scheduleRefresh();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('load', scheduleRefresh);
  setTimeout(scheduleRefresh, 300);
})();
