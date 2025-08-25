// Admin auth endpoints for admin-only login
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../dbSingleton');
const router = express.Router();

// Minimal helpers from BE/auth.js
const runQuery = async (sql, params = []) => {
  const conn = db.getConnection && db.getConnection();
  if (!conn) throw new Error('DB connection not initialized');
  if (typeof conn.promise === 'function') {
    return conn.promise().query(sql, params);
  }
  if (typeof conn.query === 'function') {
    return new Promise((resolve, reject) => {
      conn.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }
  throw new Error('Unsupported DB client on connection');
};

const findUserByEmail = async (email) => {
  const [rows] = await runQuery('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0];
};

const findUserByName = async (name) => {
  const [rows] = await runQuery('SELECT * FROM users WHERE username = ? LIMIT 1', [name]);
  return rows[0];
};

// POST /api/admin/auth/login
// Expects: { email, password }
// authenticates then enforce user_type === 'admin' before logging in 
router.post('/login', async (req, res) => {
  try {
    const { email, password, identifier, loginMethod } = req.body || {};

    const isUsernameLogin = loginMethod === 'username';
    const emailToUse = email || (!isUsernameLogin && loginMethod === 'email' ? identifier : null);
    const usernameToUse = isUsernameLogin ? (identifier || null) : null;

    if ((!emailToUse && !usernameToUse) || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const user = usernameToUse
      ? await findUserByName(usernameToUse)
      : await findUserByEmail(emailToUse);

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.password_hash) {
      console.error('User found but no password field:', user);
      return res.status(500).json({ message: 'User password missing' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // Block banned accounts from logging in (including scheduled bans)
    const isBanned = user.status && String(user.status).toLowerCase() === 'banned';
    const effective = user.ban_effective_at && new Date(user.ban_effective_at) <= new Date();
    if (isBanned || effective) {
      // Lazy flip to banned if effective time passed
      if (!isBanned && effective) {
        try {
          await runQuery(
            "UPDATE users SET status = 'banned', banned_at = NOW() WHERE user_id = ? AND status <> 'banned'",
            [user.user_id]
          );
        } catch (e) {
          console.error('Lazy flip on admin login failed:', e);
        }
      }
      return res.status(403).json({ error: 'Account is banned' });
    }

    if (!req.session) {
      console.error('Session not configured!');
      return res.status(500).json({ message: 'Session not configured' });
    }

    // Admin-only check 
    if (user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.session.user_id = user.user_id;
    req.session.user_type = user.user_type;

    return res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        user_type: user.user_type,
        profile_image: user.profile_image
      }
    });
  } catch (err) {
    console.error('ADMIN LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

// POST /api/admin/auth/logout
// logs admin out by destroying the session
router.post('/logout', async (req, res) => {
  try {
    if (req.session) {
      return req.session.destroy((err) => {
        if (err) {
          console.error('Logout destroy session error:', err);
          return res.status(500).json({ error: 'Failed to logout' });
        }
        return res.status(200).json({ ok: true });
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to logout' });
  }
});



// GET /api/admin/auth/session
// returns current admin session details 
router.get('/session', (req, res) => {
  const user = req.user || null;
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  if (user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return res.status(200).json({ authenticated: true, user });
});

module.exports = router;