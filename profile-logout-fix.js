/*
 * EcE Hub — Profile Logout
 *
 * Logout is intentionally separate from Google unlinking.
 * It clears every frontend session key used by the app, clears the
 * in-memory community account, and reloads into a clean session.
 * It never calls the Google unlink endpoint.
 */
(function installProfileLogout() {
  'use strict';

  const SESSION_KEYS = [
    'ecehub_session_token',
    'ecehub_community_session'
  ];
  const BUTTON_SELECTOR = '[data-action="profile-logout"]';

  function clearLocalSession() {
    for (const key of SESSION_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Could not clear ${key}.`, error);
      }
    }

    try {
      sessionStorage.removeItem('ecehub_session_token');
      sessionStorage.removeItem('ecehub_community_session');
    } catch (error) {
      console.warn('Could not clear sessionStorage auth state.', error);
    }

    try {
      window.communityUser = null;
      window.communityReady = false;
    } catch {}
  }

  function addLogoutButton() {
    const content = document.getElementById('content');
    if (!content || content.querySelector(BUTTON_SELECTOR)) return;

    const accountButton =
      content.querySelector('[data-action="unlink-google"]') ||
      content.querySelector('[data-action="link-google"]');

    if (!accountButton) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.dataset.action = 'profile-logout';
    button.textContent = 'Log Out';
    button.setAttribute('aria-label', 'Log out of your EcE Hub account');

    accountButton.insertAdjacentElement('afterend', button);
  }

  function logout() {
    clearLocalSession();

    // Do NOT call /api/auth/google/unlink. Logging out leaves Google linked.
    // A clean URL also prevents the old profile view from being restored.
    window.location.replace(window.location.origin + window.location.pathname);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest(BUTTON_SELECTOR);
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    logout();
  }, true);

  const observer = new MutationObserver(addLogoutButton);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  addLogoutButton();
  console.log('EcE Hub profile logout installed.');
})();
