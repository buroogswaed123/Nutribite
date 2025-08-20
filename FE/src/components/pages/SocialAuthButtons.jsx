import React, { useRef, useEffect, useState } from 'react';
import styles from '../../assets/styles/login.module.css';

/**
 * SocialAuthButtons component
 * - Renders provider buttons (Google, Facebook, X)
 * - Each handler opens a popup that mimics a provider login screen
 * - This is a frontend-only, non-functional stub: it never authenticates
 * - Reusable for both login and registration via props
 *
 * IMPORTANT:
 *  - Do NOT store social passwords. Backend should create a secure random password if the schema requires one.
 *  - Backend must implement provider routes and callback that postMessage back to opener.
 */
// Open a dummy popup that mimics a provider page but never authenticates
function openDummyPopup(providerLabel, name = 'oauthPopup', width = 500, height = 600) {
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  const features = `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`;
  const popup = window.open('about:blank', name, features);
  if (!popup) {
    // Silently fail to keep UX that "it could work" without showing errors
    return;
  }
  try {
    const doc = popup.document;
    doc.title = `${providerLabel} • Sign in`;
    const html = `
      <style>
        :root { color-scheme: light dark; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji"; margin: 0; }
        .bar { height: 54px; display: flex; align-items: center; padding: 0 16px; box-shadow: 0 1px 0 rgba(0,0,0,0.06); }
        .logo { width: 28px; height: 28px; border-radius: 6px; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; margin-right:10px; }
        .brand { font-size: 14px; opacity: .9; }
        .wrap { max-width: 420px; margin: 32px auto; padding: 0 18px; }
        h1 { font-size: 22px; margin: 0 0 16px; }
        p { line-height: 1.5; opacity: .86; }
        .btn { display:inline-flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; border:1px solid rgba(0,0,0,.15); cursor:not-allowed; opacity:.6; }
        .footer { position: fixed; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 12px; opacity: .6; }
      </style>
      <div class="bar">
        <div class="logo">${providerLabel[0] || '?'}</div>
        <div class="brand">Continue with ${providerLabel}</div>
      </div>
      <div class="wrap">
        <h1>Sign in to Nutribite</h1>
        <p>This is a demo popup. Authentication is disabled. Buttons are disabled for demonstration purposes.</p>
        <p><a class="btn" href="#" aria-disabled="true">Sign in</a></p>
        <p style="margin-top: 28px; font-size: 12px; opacity: .7;">Close this window to return.</p>
      </div>
      <div class="footer">Demo only — No data sent</div>
    `;
    doc.body.innerHTML = html;
  } catch {
    // ignore cross-origin issues if any
  }
}

const providers = {
  google: { label: 'Google', iconClass: 'fa-brands fa-google-plus-g' },
  facebook: { label: 'Facebook', iconClass: 'fa-brands fa-facebook-f' },
  x: { label: 'X', iconClass: 'fa-brands fa-x-twitter' },
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

  // In demo-only mode there is no result or error; we just show a brief info message
  const handleInfo = (text) => {
    setSuccessMsg(text);
    setErrorMsg('');
    window.clearTimeout((handleInfo)._timer);
    (handleInfo)._timer = window.setTimeout(() => {
      if (isMounted.current) setSuccessMsg('');
    }, 2000);
  };

  const startOAuth = (providerKey) => {
    const prov = providers[providerKey];
    if (!prov) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      openDummyPopup(prov.label, `oauth_${providerKey}`);
      handleInfo(`Opened ${prov.label}`);
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
