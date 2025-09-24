  const express = require('express');
  const bcrypt = require('bcrypt');
  const db = require('../dbSingleton');
  const router = express.Router();


// helpers:

const handleError = (res, err, msg = 'Server error') => {
  console.error(msg, err);
  res.status(500).json({ message: msg, error: err.message || err });
};

const hashPassword = (password) => bcrypt.hash(password, 10);

// DB query helper using singleton connection
const runQuery = async (sql, params = []) => {
  const conn = db.getConnection && db.getConnection();
  if (!conn) throw new Error('DB connection not initialized');
  if (typeof conn.promise === 'function') {
    return conn.promise().query(sql, params);
  }
  if (typeof conn.query === 'function') {
    // Wrap callback-based query in a Promise
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
  const [rows] = await runQuery(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0];
};

const findUserById = async (id) => {
  const [rows] = await runQuery(
    'SELECT * FROM users WHERE user_id = ? LIMIT 1',
    [id]
  );
  return rows[0];
};

const findUserByName = async (name) => {
  const [rows] = await runQuery(
    'SELECT * FROM users WHERE username = ? LIMIT 1',
    [name]
  );
  return rows[0];
};

//routes:

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, user_type } = req.body;
  const nameToUse = username;
  const role = user_type || 'customer';
  if (!nameToUse || !email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    if (await findUserByEmail(email))
      return res.status(400).json({ message: 'Email already in use' });

    const hashed = await hashPassword(password);
    const [result] = await runQuery(
      'INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)',
      [nameToUse, email, hashed, role]
    );

    const newUserId = result.insertId;
    // Auto-create customers row for customer role
    if (role === 'customer') {
      try {
        await runQuery('INSERT INTO customers (user_id) VALUES (?)', [newUserId]);
      } catch (e) {
        // If duplicate or other non-fatal error, log and continue
        console.error('Auto-create customer failed:', e?.message || e);
      }
    }

    res.status(201).json({ message: 'User created', userId: newUserId, user_type: role });
  } catch (err) {
    handleError(res, err, 'Error registering user');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, identifier, loginMethod } = req.body;

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

    // Enforce password expiry (6 months). Use latest password_resets.created_at for email; fallback to account_creation_time
    try {
      let refDate = null;
      // latest reset
      const [resets] = await runQuery(
        'SELECT created_at FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1',
        [user.email]
      );
      if (resets && resets[0] && resets[0].created_at) {
        refDate = new Date(resets[0].created_at);
      } else if (user.account_creation_time) {
        refDate = new Date(user.account_creation_time);
      }
      if (refDate && !isNaN(refDate.getTime())) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (refDate.getTime() <= sixMonthsAgo.getTime()) {
          return res.status(403).json({ message: 'Password expired. Please reset your password.', code: 'PASSWORD_EXPIRED' });
        }
      }
    } catch (e) {
      // If expiry check fails, do not block login, but log for diagnostics
      console.warn('Password expiry check failed:', e?.message || e);
    }

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
          console.error('Lazy flip on login failed:', e);
        }
      }
      return res.status(403).json({ error: 'Account is banned' });
    }

    // Block soft-deleted accounts with a clear message
    const isDeleted = user.status && String(user.status).toLowerCase() === 'deleted';
    if (isDeleted) {
      return res.status(403).json({ message: 'Account deleted. Please contact support if this is unexpected.' });
    }

    if (!req.session) {
      console.error('Session not configured!');
      return res.status(500).json({ message: 'Session not configured' });
    }

    req.session.user_id = user.user_id;
    req.session.user_type = user.user_type;

    res.json({
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
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

// Simple password reset: hash and update by identifier (email or username)
// Body: { identifier: string, newPassword: string }
router.post('/password_reset_simple', async (req, res) => {
  try {
    const { identifier, newPassword } = req.body || {};
    if (!identifier || !newPassword) {
      return res.status(400).json({ message: 'Missing identifier or newPassword' });
    }

    // Decide whether identifier is an email based on regex
    const isEmail = /.+@.+\..+/.test(String(identifier));
    const user = isEmail ? await findUserByEmail(identifier) : await findUserByName(identifier);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent reusing the same password
    try {
      if (user.password_hash) {
        const same = await bcrypt.compare(String(newPassword), user.password_hash);
        if (same) {
          return res.status(400).json({ message: 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית' });
        }
      }
    } catch (_) { /* ignore compare errors */ }

    // Record this reset so expiry logic will use this timestamp going forward
    try {
      await runQuery(
        'INSERT INTO password_resets (email, new_password, created_at) VALUES (?, ?, NOW())',
        [user.email, String(newPassword)]
      );
    } catch (e) {
      // If the table doesn't match expected schema, do not block the reset; just log.
      console.warn('Failed to insert into password_resets:', e?.message || e);
    }

    const hashed = await hashPassword(newPassword);
    const [result] = await runQuery(
      'UPDATE users SET password_hash = ? WHERE user_id = ? LIMIT 1',
      [hashed, user.user_id]
    );

    return res.json({ ok: true, affectedRows: result.affectedRows || 0 });
  } catch (err) {
    handleError(res, err, 'Error updating password');
  }
});

// Get current session user
router.get('/me', async (req, res) => {
  if (!req.session.user_id)
    return res.status(401).json({ message: 'Not logged in' });

  try {
    const user = await findUserById(req.session.user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    handleError(res, err, 'Error fetching user');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
