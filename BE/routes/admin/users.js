// Admin users router: list and view users (writes are stubbed to add later)

const express = require('express');
const db = require('../../dbSingleton');
const router = express.Router();
const conn = db.getConnection && db.getConnection();

// DB helper: runs a parameterized SQL query using the shared connection
const runQuery = async (sql, params = []) => {

  if (!conn) throw new Error('DB connection not initialized');
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

// Shape the user object to only return safe, necessary fields to the client
const pickUserFields = (u) => ({
  user_id: u.user_id,
  username: u.username,
  email: u.email,
  user_type: u.user_type,
  profile_image: u.profile_image
});

// GET /api/admin/users
// Lists users with optional filters: ?q=search (username/email contains), ?role=admin|customer
router.get('/', async (req, res) => {
  try {
    const { q, role } = req.query || {};
    const clauses = [];
    const params = [];

    if (q) {
      // general match on username OR email
      clauses.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (role) {
      // exact match on user_type (role)
      clauses.push('user_type = ?');
      params.push(role);
    }

    // build WHERE only when filters exist- 
    // combines the 2 previous conditions into one query and executes them at once
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await runQuery(
      `SELECT user_id, username, email, user_type, profile_image
       FROM users
       ${where}
       ORDER BY user_id DESC`,
      params
    );

    res.json(rows.map(pickUserFields));
  } catch (err) {
    console.error('ADMIN USERS LIST ERROR:', err);
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// GET /api/admin/users/:id
// fetch a single user by ID, returning safe fields only(not password_hash)
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await runQuery(
      'SELECT user_id, username, email, user_type, profile_image FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(pickUserFields(user));
  } catch (err) {
    console.error('ADMIN USERS GET ERROR:', err);
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});

// PATCH /api/admin/users/:id
//implement admin-controlled partial updates (safe fields, validation, audit)
router.patch('/:id', async (req, res) => {
  try {
    return res.status(501).json({ message: 'User update (admin) to be implemented later per plan' });
  } catch (err) {
    console.error('ADMIN USERS UPDATE ERROR:', err);
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

// POST /api/admin/users/:id/ban
// Schedule a soft-ban to take effect in 24 hours.
// - We DO NOT set status = 'banned' immediately.
// - We store ban_reason, banned_by, set banned_at = NOW(), and set ban_effective_at = NOW() + 1 day.
// Body: { reason?: string }
router.post('/:id/ban', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const adminId = (req.session && req.session.user_id) || null;
    const { reason } = req.body || {};

    // Schedule the ban to become active after 24 hours
    const [result] = await runQuery(
      `UPDATE users
       SET ban_reason = ?,
           banned_by = ?,
           banned_at = NOW(),
           ban_effective_at = DATE_ADD(NOW(), INTERVAL 1 DAY)
       WHERE user_id = ?`,
      [reason || null, adminId, targetUserId]
    );

    // Best-effort: if an admin bans their own account, end their session
    if (req.session && String(targetUserId) === String(adminId)) {
      await new Promise((resolve) => req.session.destroy(() => resolve()));
    }

    return res.status(200).json({ ok: true, affectedRows: result.affectedRows || undefined });
  } catch (err) {
    console.error('ADMIN USERS BAN ERROR:', err);
    // Likely cause if columns are missing: run the provided ALTER TABLE
    return res.status(500).json({ message: 'Error banning user', error: err.message });
  }
});

// POST /api/admin/users/:id/unban
// Lift a ban: set status = 'active' and clear ban metadata, including scheduled effective time
router.post('/:id/unban', async (req, res) => {
  try {
    const targetUserId = req.params.id;

    const [result] = await runQuery(
      `UPDATE users
       SET status = 'active',
           ban_reason = NULL,
           banned_at = NULL,
           banned_by = NULL,
           ban_effective_at = NULL
       WHERE user_id = ?`,
      [targetUserId]
    );

    return res.status(200).json({ ok: true, affectedRows: result.affectedRows || undefined });
  } catch (err) {
    console.error('ADMIN USERS UNBAN ERROR:', err);
    return res.status(500).json({ message: 'Error unbanning user', error: err.message });
  }
});

module.exports = router;