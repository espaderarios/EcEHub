/* EcE Hub — community action bridge
 * Handles community-only actions before the legacy app dispatcher.
 * Community study runs entirely from the fetched set and never attempts
 * to PATCH the set, so studying someone else's public set is read-only.
 */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';

  const text = value => String(value ?? '').trim();

  function token() {
    try {
      return localStorage.getItem('ecehub_community_session')
        || localStorage.getItem('ecehub_session_token')
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

    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(data?.error || `Community API request failed (${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.info(message);
  }

  async function addSet(setId) {
    if (!setId) return;

    try {
      await request(`/api/workspace/${encodeURIComponent(setId)}`, {
        method: 'POST'
      });

      toast('Flashcard set added to your workspace.');

      for (const name of ['loadCommunityFlashcards', 'loadFlashcards', 'loadData']) {
        if (typeof window[name] === 'function') {
          try { await window[name](); } catch {}
        }
      }
    } catch (error) {
      console.error('Failed to add community flashcard set to workspace:', error);
      toast(error?.message || 'Could not add flashcard set to workspace.');
    }
  }

  function closeStudyModal() {
    document.getElementById('community-study-modal')?.remove();
    document.body.style.overflow = '';
  }

  function installStudyStyles() {
    if (document.getElementById('community-study-styles')) return;
    const style = document.createElement('style');
    style.id = 'community-study-styles';
    style.textContent = `
      .community-study-modal{position:fixed;inset:0;z-index:13000;background:rgba(4,10,24,.82);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px)}
      .community-study-card{width:min(760px,96vw);max-height:92vh;overflow:auto;background:var(--card,#111e38);color:var(--text,#fff);border:1px solid rgba(130,140,180,.2);border-radius:18px;box-shadow:0 25px 90px rgba(0,0,0,.45)}
      .community-study-head{display:flex;justify-content:space-between;gap:16px;padding:22px 24px;border-bottom:1px solid rgba(130,140,180,.18)}
      .community-study-head h2{margin:0}.community-study-head p{margin:6px 0 0;color:var(--muted)}
      .community-study-close{border:0;background:transparent;color:inherit;font-size:28px;cursor:pointer}
      .community-study-body{padding:26px 24px}
      .community-study-progress{font-size:13px;color:var(--muted);margin-bottom:15px}
      .community-study-question{font-size:clamp(22px,4vw,32px);font-weight:800;line-height:1.35;min-height:150px;display:flex;align-items:center;justify-content:center;text-align:center;padding:25px;border:1px solid rgba(130,140,180,.2);border-radius:15px;background:rgba(99,72,255,.06)}
      .community-study-answer{margin-top:15px;padding:20px;border-radius:14px;background:rgba(99,72,255,.11);border:1px solid rgba(99,72,255,.25);line-height:1.6}
      .community-study-answer-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:7px;font-weight:800}
      .community-study-actions{display:flex;justify-content:center;gap:10px;margin-top:18px;flex-wrap:wrap}
      .community-study-footer{display:flex;justify-content:space-between;gap:10px;padding:16px 24px;border-top:1px solid rgba(130,140,180,.18)}
      .community-study-error{text-align:center;padding:30px;color:#ff9b9b}
      @media(max-width:600px){.community-study-body,.community-study-head,.community-study-footer{padding-left:16px;padding-right:16px}.community-study-question{min-height:130px;padding:18px}}
    `;
    document.head.appendChild(style);
  }

  function openStudyModal(set) {
    const rawCards = Array.isArray(set?.cards)
      ? set.cards
      : Array.isArray(set?.flashcards) ? set.flashcards : [];

    const cards = rawCards.map(card => ({
      question: text(Array.isArray(card) ? card[0] : card?.question),
      answer: text(Array.isArray(card) ? card[1] : card?.answer)
    })).filter(card => card.question && card.answer);

    if (!cards.length) {
      toast('This flashcard set has no study cards.');
      return;
    }

    installStudyStyles();
    closeStudyModal();

    const modal = document.createElement('div');
    modal.id = 'community-study-modal';
    modal.className = 'community-study-modal';
    modal.innerHTML = `
      <div class="community-study-card" role="dialog" aria-modal="true" aria-label="Study ${text(set.title || 'flashcards')}">
        <div class="community-study-head">
          <div>
            <h2>${escapeHtml(set.title || 'Community Flashcards')}</h2>
            <p>${escapeHtml(set.subject || 'Community set')}</p>
          </div>
          <button type="button" class="community-study-close" data-study-close aria-label="Close">×</button>
        </div>
        <div class="community-study-body">
          <div class="community-study-progress" id="community-study-progress"></div>
          <div class="community-study-question" id="community-study-question"></div>
          <div class="community-study-answer" id="community-study-answer" hidden>
            <div class="community-study-answer-label">Answer</div>
            <div id="community-study-answer-text"></div>
          </div>
          <div class="community-study-actions">
            <button type="button" class="btn primary" id="community-study-flip">Show answer</button>
          </div>
        </div>
        <div class="community-study-footer">
          <button type="button" class="btn" id="community-study-prev">Previous</button>
          <button type="button" class="btn" id="community-study-next">Next</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    let index = 0;
    let revealed = false;

    const question = modal.querySelector('#community-study-question');
    const answer = modal.querySelector('#community-study-answer');
    const answerText = modal.querySelector('#community-study-answer-text');
    const progress = modal.querySelector('#community-study-progress');
    const flip = modal.querySelector('#community-study-flip');

    const renderCard = () => {
      const card = cards[index];
      revealed = false;
      question.textContent = card.question;
      answerText.textContent = card.answer;
      answer.hidden = true;
      flip.textContent = 'Show answer';
      progress.textContent = `Card ${index + 1} of ${cards.length}`;
    };

    modal.querySelectorAll('[data-study-close]').forEach(button => {
      button.addEventListener('click', closeStudyModal);
    });
    modal.addEventListener('click', event => {
      if (event.target === modal) closeStudyModal();
    });

    flip.addEventListener('click', () => {
      revealed = !revealed;
      answer.hidden = !revealed;
      flip.textContent = revealed ? 'Hide answer' : 'Show answer';
    });

    modal.querySelector('#community-study-next').addEventListener('click', () => {
      index = (index + 1) % cards.length;
      renderCard();
    });

    modal.querySelector('#community-study-prev').addEventListener('click', () => {
      index = (index - 1 + cards.length) % cards.length;
      renderCard();
    });

    document.addEventListener('keydown', function keyboard(event) {
      if (!document.getElementById('community-study-modal')) {
        document.removeEventListener('keydown', keyboard);
        return;
      }
      if (event.key === 'Escape') closeStudyModal();
      if (event.key === 'ArrowRight') modal.querySelector('#community-study-next').click();
      if (event.key === 'ArrowLeft') modal.querySelector('#community-study-prev').click();
      if (event.key === ' ' || event.key === 'Enter') {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        flip.click();
      }
    });

    renderCard();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function studySet(setId) {
    if (!setId) return;

    try {
      const result = await request(`/api/flashcards/${encodeURIComponent(setId)}`);
      const set = result?.set || result?.flashcardSet || result;
      if (!set) throw new Error('Flashcard set could not be loaded.');
      openStudyModal(set);
    } catch (error) {
      console.error('Failed to load community flashcard set for study:', error);
      toast(error?.message || 'Could not load this flashcard set.');
    }
  }

  async function openUser(hit) {
    const id = text(hit.dataset.id);
    const username = text(hit.dataset.username);

    if (!id && !username) return;

    const me = window.communityUser;
    if (
      me &&
      ((id && id === text(me.id)) ||
       (username && username.toLocaleLowerCase() === text(me.username).toLocaleLowerCase()))
    ) {
      if (typeof window.go === 'function') window.go('profile');
      return;
    }

    if (typeof window.openCommunityUserProfile === 'function') {
      await window.openCommunityUserProfile({
        id,
        username,
        displayName: text(hit.dataset.displayName),
        avatarUrl: text(hit.dataset.avatarUrl),
        bio: text(hit.dataset.bio)
      });
    }
  }

  document.addEventListener('click', event => {
    const userHit = event.target.closest('[data-action="view-community-user"]');
    if (userHit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openUser(userHit);
      return;
    }

    const workspaceHit = event.target.closest('[data-action="add-community-set"]');
    if (workspaceHit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addSet(text(workspaceHit.dataset.id));
      return;
    }

    const studyHit = event.target.closest('[data-action="study-community-set"]');
    if (studyHit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      studySet(text(studyHit.dataset.id));
    }
  }, true);

  window.addCommunitySetToWorkspace = addSet;
  window.studyCommunitySet = studySet;

  console.log('EcE Hub community action bridge installed.');
})();
