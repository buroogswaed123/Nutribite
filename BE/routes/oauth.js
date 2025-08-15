// routes/oauth.js to handle authentication from social providers (manual, no passport/jwt)
const express = require('express');
const router = express.Router();
const db = require('../dbSingleton');
const crypto = require('crypto');
const https = require('https');

// Helper: get DB connection
const conn = db.getConnection();

const findUserByEmail = async (email) => {
  const [rows] = await conn.promise().query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows?.[0] || null;
};

// In current schema we do not store provider/provider_id on users; we merge strictly by verified email.
const findUserByProvider = async () => null;

function secureRandomString(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function createUserFromProvider({ email, usernameBase, provider, providerId, userType = 'customer' }) {
  let username = usernameBase || (email ? email.split('@')[0] : `user_${providerId}`);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? username : `${username}${attempt}`;
    try {
      // If your schema requires password_hash not null, hash a random password with bcrypt here.
      const bcrypt = require('bcrypt');
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const [result] = await conn.promise().query(
        `INSERT INTO users (email, username, password_hash, user_type)
         VALUES (?, ?, ?, ?)`,
        [email, candidate, passwordHash, userType]
      );
      const [rows] = await conn.promise().query('SELECT * FROM users WHERE user_id = ?', [result.insertId]);
      return rows[0];
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') { attempt++; continue; }
      throw err;
    }
  }
}
// Config
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
  FRONTEND_ORIGIN = 'http://localhost:5173'
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth env vars missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
}
if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
  console.warn('Facebook OAuth env vars missing. Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET.');
}
// X/Twitter intentionally not implemented for this project

// Small helpers to do HTTP requests without extra deps
function postForm(urlString, formObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = new URLSearchParams(formObj).toString();
    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      port: url.port || 443,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Small utility: send success popup HTML
function sendPopupSuccess(res, payload) {
  res.set('Content-Type', 'text/html');
  res.send(renderSuccessHtml(payload, ''));
}

// Small utility: unified demo flow for providers
async function demoFlow({ req, res, provider, logoChar, brandColor, demoEmail, demoName, providerId }) {
  let user = await findUserByEmail(demoEmail);
  let existed = !!user;
  if (!user) {
    const usernameBase = (demoName || demoEmail.split('@')[0]).replace(/\s+/g, '').toLowerCase();
    user = await createUserFromProvider({ email: demoEmail, usernameBase, provider, providerId, userType: 'customer' });
    existed = false;
  }
  req.session.user_id = user.user_id;
  req.session.user_type = user.user_type;
  const payload = {
    type: 'oauth-success',
    user: { id: user.user_id, email: user.email, username: user.username, user_type: user.user_type },
    token: null,
    existed: !!existed,
    demo: true,
    provider
  };
  const variant = (req.query.variant || 'login').toLowerCase();
  const isRegister = variant === 'register';
  const confirmLabel = isRegister ? 'אשר הרשמה' : 'אשר התחברות';
  const successText = '';
  res.set('Content-Type', 'text/html');
  return res.send(
    renderDemoConfirmHtml({ provider, logoChar, brandColor, isRegister, payload, confirmLabel, successText })
  );
}

// HTML helpers to reduce duplication
function renderSuccessHtml(payload) {
  return `<!doctype html>
<html lang="he"><head><meta charset="utf-8"><title>התחברות הושלמה</title></head>
<body>
<script>
  (function() {
    try {
      var data = ${JSON.stringify(JSON.stringify(payload))};
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(JSON.parse(data), '*');
      }
    } catch (e) {}
    setTimeout(function(){ try{ window.close(); }catch(e){} }, 2500);
  })();
</script>
</body></html>`;
}

function renderDemoConfirmHtml({ provider, logoChar, brandColor, isRegister, payload, confirmLabel, successText }) {
  return `<!doctype html>
<html lang="he"><head><meta charset="utf-8"><title>${provider} דמו</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f7f8;color:#111}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.06);padding:24px;max-width:360px;width:90%}
  h1{font-size:1.1rem;margin:0 0 8px}
  p{margin:0 0 16px;color:#374151}
  button{background:${brandColor};color:#fff;border:none;border-radius:8px;padding:10px 14px;font-size:0.95rem;cursor:pointer}
  button:disabled{opacity:.6;cursor:not-allowed}
  .ok{color:#05622b;margin-top:12px}
  small{color:#6b7280}
  .logo{display:inline-flex;align-items:center;gap:8px;margin-bottom:8px}
  .logo i{font-style:normal;background:${brandColor};color:#fff;border-radius:6px;padding:2px 6px;font-size:.8rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><i>${logoChar}</i><span>${provider} דמו</span></div>
    <h1>${isRegister ? 'אישור הרשמה' : 'אישור התחברות'}</h1>
    <p>${isRegister ? `לחץ/י כדי להשלים הרשמה באמצעות ${provider} (דמו)` : `לחץ/י כדי להשלים התחברות באמצעות ${provider} (דמו)`}</p>
    <button id="confirmBtn">${confirmLabel}</button>
    <p><small>החלון ייסגר אוטומטית לאחר מספר שניות</small></p>
  </div>
  <script>
    (function(){
      var payload = ${JSON.stringify(JSON.stringify(payload))};
      var btn = document.getElementById('confirmBtn');
      btn.addEventListener('click', function(){
        btn.disabled = true;
        try{
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(JSON.parse(payload), '*');
          }
        }catch(e){}
        setTimeout(function(){ try{ window.close(); }catch(e){} }, 2500);
      });
    })();
  </script>
</body></html>`;
}

function getJson(urlString, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      port: url.port || 443,
      headers
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Hybrid demo mode:
// If GOOGLE_/FACEBOOK_ env vars are missing, we auto-mock the provider response so anyone can run the project
// without setting up developer apps. When env vars are present, real OAuth runs as usual.

// 1) Start Google OAuth
router.get('/google', async (req, res) => {
  try {
    // Demo mode: if Google envs are missing, simulate a successful login immediately
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return demoFlow({
        req,
        res,
        provider: 'Google',
        logoChar: 'G',
        brandColor: '#111',
        demoEmail: 'demo+google@nutribite.local',
        demoName: 'Google Demo',
        providerId: 'demo-google'
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauth_state = state;
    const redirectUri = 'http://localhost:3000/auth/google/callback';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('state', state);
    res.redirect(authUrl.toString());
  } catch (err) {
    console.error('Error starting Google OAuth:', err);
    res.redirect('/auth/failure');
  }
});

// 2) Google OAuth callback (no passport)
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauth_state) {
      return res.redirect('/auth/failure');
    }

    const redirectUri = 'http://localhost:3000/auth/google/callback';
    // Exchange code for tokens
    const tokenResp = await postForm('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const accessToken = tokenResp.access_token;
    const idToken = tokenResp.id_token; // unused but available
    if (!accessToken) {
      return res.redirect('/auth/failure');
    }

    // Fetch userinfo
    const userInfo = await getJson('https://www.googleapis.com/oauth2/v2/userinfo', {
      Authorization: `Bearer ${accessToken}`
    });

    const email = userInfo.email || null;
    const emailVerified = userInfo.verified_email === true || userInfo.email_verified === true;
    const name = userInfo.name || '';

    if (!email || !emailVerified) {
      return res.redirect('/auth/failure');
    }

    // Merge by email
    let user = await findUserByEmail(email);
    let existed = !!user;
    if (!user) {
      const usernameBase = (name || email.split('@')[0] || 'user').replace(/\s+/g, '').toLowerCase();
      user = await createUserFromProvider({ email, usernameBase, provider: 'google', providerId: userInfo.id, userType: 'customer' });
      existed = false;
    }

    // Set session
    req.session.user_id = user.user_id;
    req.session.user_type = user.user_type;

    // Respond with tiny HTML that postMessages back to opener
    const payload = {
      type: 'oauth-success',
      user: { id: user.user_id, email: user.email, username: user.username, user_type: user.user_type },
      token: null,
      existed: !!existed,
    };

    sendPopupSuccess(res, payload);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/auth/failure');
  }
});

router.get('/failure', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>OAuth Failed</title></head>
<body>
<script>
  (function() {
    try {
      var data = { type: 'oauth-error', error: 'OAuth failed or was cancelled.' };
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(data, '*');
      }
    } catch (e) {}
    try { window.close(); } catch(e) {}
  })();
</script>
</body></html>`);
});

// 3) Start Facebook OAuth
router.get('/facebook', async (req, res) => {
  try {
    // Demo mode: if Facebook envs are missing, simulate a successful login immediately
    if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
      return demoFlow({
        req,
        res,
        provider: 'Facebook',
        logoChar: 'f',
        brandColor: '#1877f2',
        demoEmail: 'demo+facebook@nutribite.local',
        demoName: 'Facebook Demo',
        providerId: 'demo-facebook'
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauth_state = state;
    const redirectUri = 'http://localhost:3000/auth/facebook/callback';
    const authUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
    authUrl.searchParams.set('client_id', FACEBOOK_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'email,public_profile');
    authUrl.searchParams.set('state', state);
    res.redirect(authUrl.toString());
  } catch (err) {
    console.error('Error starting Facebook OAuth:', err);
    res.redirect('/auth/failure');
  }
});

// 4) Facebook OAuth callback
router.get('/facebook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauth_state) {
      return res.redirect('/auth/failure');
    }
    const redirectUri = 'http://localhost:3000/auth/facebook/callback';
    // Exchange code for token
    const tokenResp = await getJson(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${encodeURIComponent(FACEBOOK_CLIENT_ID)}&client_secret=${encodeURIComponent(FACEBOOK_CLIENT_SECRET)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`
    );
    const accessToken = tokenResp.access_token;
    if (!accessToken) return res.redirect('/auth/failure');

    // Fetch user profile with email
    const fields = 'id,name,email,verified';
    const userInfo = await getJson(`https://graph.facebook.com/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`);
    const email = userInfo.email || null;
    const name = userInfo.name || '';
    const emailVerified = userInfo.verified === true || !!email; // FB often returns verified when email present

    if (!email || !emailVerified) {
      return res.redirect('/auth/failure');
    }

    let user = await findUserByEmail(email);
    let existed = !!user;
    if (!user) {
      const usernameBase = (name || email.split('@')[0] || 'user').replace(/\s+/g, '').toLowerCase();
      user = await createUserFromProvider({ email, usernameBase, provider: 'facebook', providerId: userInfo.id, userType: 'customer' });
      existed = false;
    }

    req.session.user_id = user.user_id;
    req.session.user_type = user.user_type;

    const payload = {
      type: 'oauth-success',
      user: { id: user.user_id, email: user.email, username: user.username, user_type: user.user_type },
      token: null,
      existed: !!existed,
    };

    sendPopupSuccess(res, payload);
  } catch (err) {
    console.error('Facebook OAuth callback error:', err);
    res.redirect('/auth/failure');
  }
});

module.exports = router;
