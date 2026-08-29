/*
 * EcE Hub Community Authentication Fix
 *
 * The community Worker uses a frontend-held bearer session token because
 * GitHub Pages cannot reliably depend on the cross-site HttpOnly cookie.
 *
 * app.js still initializes /api/auth/session on every page load. If a bearer
 * token already exists, intercept that initialization request and restore the
 * existing account instead of creating another guest account.
 */
(function installCommunitySessionRestore() {
  const SESSION_KEY = 'ecehub_session_token';
  const SESSION_PATH = '/api/auth/session';
  const PROFILE_PATH = '/api/users/me';

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function communityAwareFetch(input, init = {}) {
    let requestUrl = '';

    try {
      requestUrl = typeof input === 'string'
        ? input
        : input?.url || '';
    } catch {
      requestUrl = '';
    }

    const token = (() => {
      try {
        return localStorage.getItem(SESSION_KEY) || '';
      } catch {
        return '';
      }
    })();

    let parsedUrl = null;

    try {
      parsedUrl = new URL(requestUrl, window.location.href);
    } catch {
      parsedUrl = null;
    }

    /*
     * If we already have a frontend session token, do NOT create a new
     * anonymous account when app.js initializes its community session.
     * Restore the user represented by the token through /api/users/me.
     */
    if (
      token &&
      parsedUrl &&
      parsedUrl.pathname === SESSION_PATH &&
      String(init?.method || 'GET').toUpperCase() === 'POST'
    ) {
      try {
        const profileResponse = await originalFetch(
          new URL(PROFILE_PATH, parsedUrl.origin).toString(),
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          if (profileData?.user) {
            return new Response(
              JSON.stringify({
                user: profileData.user,
                existing: true,
                sessionToken: token
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json; charset=utf-8'
                }
              }
            );
          }
        }

        /*
         * The token is stale/invalid. Remove it and let the normal session
         * endpoint create a fresh guest account.
         */
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {}
      } catch (error) {
        console.warn(
          'Existing community session could not be restored; falling back to guest session.',
          error
        );
      }
    }

    return originalFetch(input, init);
  };

  console.log('Community bearer-session restore installed.');
})();
