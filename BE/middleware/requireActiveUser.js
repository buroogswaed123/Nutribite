// Middleware: ensure the current user is not banned
// - If req.user exists, we check its status.
// - Otherwise, if there's a session user_id, we load the user and attach to req.user.
// - If banned, respond 403 and block the request.

const db = require('../dbSingleton');
const conn = db.getConnection && db.getConnection();
const getConn = () => {
 
  if (!conn) throw new Error('DB connection not initialized');
  return conn;
};

const runQuery = async (sql, params = []) => {
  const conn = getConn();
  if (typeof conn.promise === 'function') return conn.promise().query(sql, params);
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

module.exports = async function requireActiveUser(req, res, next) {
  try {
    // If upstream auth already populated req.user, check it
    if (req.user) {
      // Update last_seen for simple presence tracking
      try {
        await runQuery('UPDATE users SET last_seen = NOW() WHERE user_id = ?', [req.user.user_id]);
      } catch (e) {
        console.error('Failed to update last_seen (req.user):', e);
      }
      const isBanned = req.user.status && String(req.user.status).toLowerCase() === 'banned';
      const effective = req.user.ban_effective_at && new Date(req.user.ban_effective_at) <= new Date();
      if (isBanned || effective) {
        // Lazy flip if effective passed but status not yet banned
        if (!isBanned && effective) {
          try {
            await runQuery(
              "UPDATE users SET status = 'banned', banned_at = NOW() WHERE user_id = ? AND status <> 'banned'",
              [req.user.user_id]
            );
            req.user.status = 'banned';
          } catch (e) {
            console.error('Lazy flip (req.user) failed:', e);
          }
        }
        return res.status(403).json({ error: 'Account is banned' });
      }
      return next();
    }

    // Fallback: fetch from session if available
    const userId = req.session && req.session.user_id;
    if (!userId) return next(); // Not responsible for authentication here

    const [rows] = await runQuery(
      'SELECT user_id, username, email, user_type, profile_image, status, ban_effective_at FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const user = rows[0];
    if (!user) return next();

    req.user = user;
    // Update last_seen for simple presence tracking
    try {
      await runQuery('UPDATE users SET last_seen = NOW() WHERE user_id = ?', [user.user_id]);
    } catch (e) {
      console.error('Failed to update last_seen (session user):', e);
    }
    const isBanned = user.status && String(user.status).toLowerCase() === 'banned';
    const effective = user.ban_effective_at && new Date(user.ban_effective_at) <= new Date();
    if (isBanned || effective) {
      // Lazy-flip to banned if effective time passed but status not yet 'banned'
      if (!isBanned && effective) {
        try {
          await runQuery(
            "UPDATE users SET status = 'banned', banned_at = NOW() WHERE user_id = ? AND status <> 'banned'",
            [user.user_id]
          );
          req.user.status = 'banned';
        } catch (e) {
          console.error('Lazy flip to banned failed:', e);
        }
      }
      return res.status(403).json({ error: 'Account is banned' });
    }

    return next();
  } catch (err) {
    console.error('requireActiveUser error:', err);
    return res.status(500).json({ error: 'Failed to check user status' });
  }
}
