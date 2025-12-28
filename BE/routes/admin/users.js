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
  profile_image: u.profile_image,
  status: u.status || null,
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
      `SELECT user_id, username, email, user_type, profile_image, status
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
      'SELECT user_id, username, email, user_type, profile_image, status FROM users WHERE user_id = ? LIMIT 1',
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

// GET /api/admin/users/:id/orders - list orders for a given user_id (resolve cust_id)
router.get('/:id/orders', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ message: 'Invalid user id' });
    // Resolve customer id
    const [custRows] = await runQuery('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [userId]);
    const cust = Array.isArray(custRows) && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.json({ items: [] });
    // Fetch orders
    const [orders] = await runQuery(
      `SELECT 
         o.order_id,
         o.order_status AS status,
         o.total_price,
         o.order_date,
         o.set_delivery_time
       FROM orders o
       WHERE o.cust_id = ?
       ORDER BY o.order_id DESC`,
      [cust]
    );
    return res.json({ items: orders });
  } catch (err) {
    console.error('ADMIN USER ORDERS ERROR:', err);
    return res.status(500).json({ message: 'Error fetching user orders', error: err.message });
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

// DELETE /api/admin/users/:id
// Soft-delete a user by setting status = 'deleted'.
// If an admin deletes their own account, end their session.
router.delete('/:id', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const [result] = await runQuery(
      `UPDATE users SET status = 'deleted' WHERE user_id = ?`,
      [targetUserId]
    );

    // If deleting own account, destroy session
    const adminId = (req.session && req.session.user_id) || null;
    if (req.session && String(targetUserId) === String(adminId)) {
      await new Promise((resolve) => req.session.destroy(() => resolve()));
    }

    return res.json({ ok: true, affectedRows: result?.affectedRows || 0 });
  } catch (err) {
    console.error('ADMIN USERS DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

// POST /api/admin/users/:id/restore
// Restore a soft-deleted user (set status back to 'active')
router.post('/:id/restore', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const [result] = await runQuery(
      `UPDATE users SET status = 'active' WHERE user_id = ? AND status = 'deleted'`,
      [targetUserId]
    );
    return res.json({ ok: true, affectedRows: result?.affectedRows || 0 });
  } catch (err) {
    console.error('ADMIN USERS RESTORE ERROR:', err);
    return res.status(500).json({ message: 'Error restoring user', error: err.message });
  }
});

// GET /api/admin/users/profile/me
// Get current admin's profile (combines users + admin_profiles tables)
router.get('/profile/me', async (req, res) => {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const [rows] = await runQuery(
      `SELECT 
        u.user_id,
        u.username,
        u.email,
        u.profile_image,
        u.account_creation_time,
        u.last_seen,
        ap.full_name,
        ap.phone
       FROM users u
       LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id
       WHERE u.user_id = ? LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('ADMIN PROFILE GET ERROR:', err);
    return res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

// PATCH /api/admin/users/profile/me
// Update current admin's profile
router.patch('/profile/me', async (req, res) => {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { full_name, phone, email } = req.body;

    // Update email in users table if provided
    if (email) {
      await runQuery('UPDATE users SET email = ? WHERE user_id = ?', [email, userId]);
    }

    // Update or insert admin_profiles
    if (full_name !== undefined || phone !== undefined) {
      const [existing] = await runQuery(
        'SELECT admin_profile_id FROM admin_profiles WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (existing && existing.length > 0) {
        // Update existing profile
        const updates = [];
        const params = [];
        if (full_name !== undefined) {
          updates.push('full_name = ?');
          params.push(full_name);
        }
        if (phone !== undefined) {
          updates.push('phone = ?');
          params.push(phone);
        }
        params.push(userId);

        if (updates.length > 0) {
          await runQuery(
            `UPDATE admin_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
            params
          );
        }
      } else {
        // Insert new profile
        await runQuery(
          'INSERT INTO admin_profiles (user_id, full_name, phone) VALUES (?, ?, ?)',
          [userId, full_name || null, phone || null]
        );
      }
    }

    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('ADMIN PROFILE UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

module.exports = router;