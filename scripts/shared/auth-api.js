const AUTH_ORIGIN = 'https://demo.bbird.live';
const AUTH_PATHS = {
  login: '/auth/login',
  logout: '/auth/logout',
  session: '/auth/session',
};

const AUTH_LABELS = {
  login: 'Login',
  logout: 'Logout',
};

function authUrl(path) {
  return new URL(path, AUTH_ORIGIN).toString();
}

export function getDefaultAuthLabel(type) {
  const override = typeof document !== 'undefined'
    ? document.querySelector(`meta[name="${type}-label"]`)?.content?.trim()
    : '';
  return override || AUTH_LABELS[type] || '';
}

export function getLoginUrl(returnTo = window.location.href) {
  const target = new URL(AUTH_PATHS.login, AUTH_ORIGIN);
  target.searchParams.set('returnTo', returnTo);
  return target.toString();
}

export function getLogoutUrl() {
  return authUrl(AUTH_PATHS.logout);
}

/** Shape aligned with `workers/auth` `/auth/session` JSON (anonymous when not logged in). */
const ANONYMOUS_SESSION = {
  authenticated: false,
  email: '',
  hasJwtAssertion: false,
};

const AUTH_STARTED_KEY = 'auth-started';

/** Remembers that the visitor used the login link, so later pages ask for the session. */
export function markAuthStarted(started) {
  try {
    if (started) localStorage.setItem(AUTH_STARTED_KEY, '1');
    else localStorage.removeItem(AUTH_STARTED_KEY);
  } catch { /* storage unavailable */ }
}

// a cross-site credentialed request on every page view is a third-party cookie hit
function shouldAskForSession() {
  if (window.location.hostname.endsWith('bbird.live')) return true;
  try {
    return localStorage.getItem(AUTH_STARTED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Loads `/auth/session` JSON (anonymous on non-OK or failure).
 * `redirect: 'manual'` — Cloudflare Access replies with 302 to *.cloudflareaccess.com;
 */
export async function getSessionState() {
  if (!shouldAskForSession()) return { ...ANONYMOUS_SESSION, path: AUTH_PATHS.session };
  try {
    const response = await fetch(authUrl(AUTH_PATHS.session), {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { ...ANONYMOUS_SESSION, path: AUTH_PATHS.session };
    }
    return await response.json();
  } catch {
    return { ...ANONYMOUS_SESSION, path: AUTH_PATHS.session };
  }
}
