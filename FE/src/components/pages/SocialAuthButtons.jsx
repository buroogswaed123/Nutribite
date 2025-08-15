import React, { useRef, useEffect, useState } from 'react';
import styles from '../../assets/styles/login.module.css';

/**
 * SocialAuthButtons component
 * - Renders provider buttons (Google, Facebook, X)
 * - Each handler opens a popup to backend OAuth start route
 * - Listens for postMessage from popup and returns { user, token }
 * - Reusable for both login and registration via props
 *
 * IMPORTANT:
 *  - Do NOT store social passwords. Backend should create a secure random password if the schema requires one.
 *  - Backend must implement provider routes and callback that postMessage back to opener.
 */

const BACKEND_BASE = 'http://localhost:3000';

// Public helper: check if a user exists by email
export async function checkIfUserExists(email) {
  if (!email) return false;
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users/exists?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    // Expected shape: { exists: boolean }
    if (typeof data?.exists === 'boolean') return data.exists;
    return !!data; // fallback
  } catch (e) {
    console.warn('checkIfUserExists failed; backend route may be missing.', e);
    return false;
  }
}

// Open OAuth popup and wait for postMessage
function openAuthPopup(url, name = 'oauthPopup', width = 500, height = 600) {
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  const features = `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`;
  const popup = window.open(url, name, features);

  if (!popup) return Promise.reject(new Error('Popup blocked. Please enable popups and try again.'));

  return new Promise((resolve, reject) => {
    const MAX_WAIT_MS = 120000; // 2 minutes
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', onMessage);
        reject(new Error('Login window was closed'));
      }
    }, 500);
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('OAuth timed out. Please try again.'));
    }, MAX_WAIT_MS);

    function cleanup() {
      clearInterval(timer);
      clearTimeout(timeoutId);
      window.removeEventListener('message', onMessage);
      try { popup.close(); } catch {}
    }

    function onMessage(event) {
      // Security: accept only backend on common local origins
      const allowed = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):3000$/.test(event.origin);
      if (!allowed) return;
      const data = event.data || {};
      if (data?.type === 'oauth-success') {
        cleanup();
        resolve(data); // { user, token }
      } else if (data?.type === 'oauth-error') {
        cleanup();
        reject(new Error(data?.error || 'OAuth error'));
      }
    }

    window.addEventListener('message', onMessage);
  });
}

const providers = {
  google: { label: 'Google', startPath: '/auth/google', iconClass: 'fa-brands fa-google-plus-g' },
  facebook: { label: 'Facebook', startPath: '/auth/facebook', iconClass: 'fa-brands fa-facebook-f' },
  x: { label: 'X', startPath: '/auth/x', iconClass: 'fa-brands fa-x-twitter' },
};

export default function Buttons({ onSuccess, onError, variant = 'login', className = '', classes: css }) {
  const isMounted = useRef(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleResult = (payload) => {
    const user = payload?.user;
    const token = payload?.token;
    const existed = Boolean(payload?.existed);
    try {
      if (token) localStorage.setItem('auth_token', token);
      if (user?.user_type) localStorage.setItem('user_type', user.user_type);
    } catch {}
    if (typeof onSuccess === 'function') {
      // Defer UX to parent (e.g., navigate immediately without flashing a toast)
      return onSuccess(user, token, existed);
    }
    // Toast-like success message (only when parent doesn't handle success)
    const msg = existed ? 'Welcome back! You are now signed in.' : 'Account created. You are now signed in.';
    setSuccessMsg(msg);
    setErrorMsg('');
    window.clearTimeout((handleResult)._successTimer);
    (handleResult)._successTimer = window.setTimeout(() => {
      if (isMounted.current) setSuccessMsg('');
    }, 3000);
  };

  const handleError = (err) => {
    if (typeof onError === 'function') onError(err);
    console.error('Social auth error:', err);
    // Optional UX: toast/alert
    setErrorMsg(err?.message || 'Social login failed');
    setSuccessMsg('');
    window.clearTimeout((handleError)._errorTimer);
    (handleError)._errorTimer = window.setTimeout(() => {
      if (isMounted.current) setErrorMsg('');
    }, 3500);
  };

  const startOAuth = async (providerKey) => {
    const prov = providers[providerKey];
    if (!prov) return;
    try {
      setIsLoading(true);
      setErrorMsg('');
      const url = `${BACKEND_BASE}${prov.startPath}?variant=${encodeURIComponent(variant)}`;
      const payload = await openAuthPopup(url, `oauth_${providerKey}`);
      if (!isMounted.current) return;
      handleResult(payload);
    } catch (e) {
      // Popup blocked fallback: navigate current window to provider flow
      if (e && /Popup blocked/i.test(e.message || '')) {
        const url = `${BACKEND_BASE}${providers[providerKey].startPath}?variant=${encodeURIComponent(variant)}`;
        window.location.href = url;
        return;
      }
      if (!isMounted.current) return;
      handleError(e);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  // Mini functions per provider
  const handleLoginGoogle = () => startOAuth('google');
  // const handleLoginGitHub = () => startOAuth('github'); // removed
  const handleLoginFacebook = () => startOAuth('facebook');
  // const handleLoginLinkedIn = () => startOAuth('linkedin'); // removed
  const handleLoginX = () => startOAuth('x');

  // Match login.module.css structure: prefer passed classes, otherwise fall back to local import
  const cssMerged = css || styles;
  const wrapperClass = cssMerged?.icons ? cssMerged.icons : className;
  const commonAnchorProps = {
    role: 'button',
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      outlineOffset: 2,
      opacity: isLoading ? 0.6 : 1,
      pointerEvents: isLoading ? 'none' : 'auto',
      cursor: isLoading ? 'not-allowed' : 'pointer',
    },
    href: '#',
  };

  return (
    <div className={wrapperClass} aria-busy={isLoading}>
      <a {...commonAnchorProps} title="Continue with Google" aria-label="Continue with Google" onClick={(e) => { e.preventDefault(); handleLoginGoogle(); }}>
        <i className="fa-brands fa-google-plus-g" />
      </a>
      <a {...commonAnchorProps} title="Continue with Facebook" aria-label="Continue with Facebook" onClick={(e) => { e.preventDefault(); handleLoginFacebook(); }}>
        <i className="fa-brands fa-facebook-f" />
      </a>
      <a {...commonAnchorProps} title="Continue with X" aria-label="Continue with X" onClick={(e) => { e.preventDefault(); handleLoginX(); }}>
        <i className="fa-brands fa-x-twitter" />
      </a>
      {successMsg ? (
        <p role="status" aria-live="polite" style={{ marginTop: '0.75rem', color: '#2e7d32', fontSize: '0.9rem', textAlign: 'center' }}>
          {successMsg}
        </p>
      ) : null}
      {errorMsg ? (
        <p role="status" aria-live="polite" style={{ marginTop: '0.75rem', color: '#d33', fontSize: '0.9rem', textAlign: 'center' }}>
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
