/*
 * EcE Hub Profile Logout
 *
 * Adds a real "Log Out" action to the Profile > Account section.
 * This intentionally does NOT call the Google unlink endpoint.
 * It only clears the frontend bearer session and reloads the app so the
 * current community account is no longer restored.
 */
(function installProfileLogout() {
  const SESSION_KEY = 'ecehub_session_token';
  const BUTTON_SELECTOR = '[data-action="profile-logout"]';

  function addLogoutButton() {
    const content = document.getElementById('content');
    if (!content) return;

    const accountButton =
      content.querySelector('[data-action="unlink-google"]') ||
      content.querySelector('[data-action="link-google"]');

    if (!accountButton) return;
    if (content.querySelector(BUTTON_SELECTOR)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.dataset.action = 'profile-logout';
    button.textContent = 'Log Out';
    button.setAttribute('aria-label', 'Log out of your EcE Hub account');

    accountButton.insertAdjacentElement('afterend', button);
  }

  async function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn('EcE Hub logout could not clear the session token.', error);
    }

    // Do not touch Google linking state or call /api/auth/google/unlink.
    window.location.reload();
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest(BUTTON_SELECTOR);
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
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
