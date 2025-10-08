// Notifications routes (user messages and alerts)
const express = require('express');
const dbSingleton=require('../dbSingleton');
const conn=dbSingleton.getConnection();
const router = express.Router();



// GET /api/notifications/user/:user_id
// List all notifications for a user
router.get('/user/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const sql = 'SELECT * FROM notifications WHERE user_id = ?';
    conn.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET /api/notifications/user/:user_id/type
// Summary by type for a user. Optional: ?unread=1 to filter unread
router.get('/user/:user_id/type', (req, res) => {
    const user_id = req.params.user_id;
    const onlyUnread = String(req.query.unread || '').trim() === '1';
    // We don't know if the schema uses status (unread/read) or is_read (0/1). Build a dynamic filter.
    // First, try with 'status' column; if it errors with ER_BAD_FIELD_ERROR, retry with 'is_read'.
    const base = 'SELECT type, COUNT(*) AS count FROM notifications WHERE user_id = ?';
    const group = ' GROUP BY type ORDER BY count DESC';
    const sqlStatus = onlyUnread ? `${base} AND status = 'unread'${group}` : `${base}${group}`;
    conn.query(sqlStatus, [user_id], (err, rows) => {
        if (!err) return res.json({ items: rows || [] });
        if (err && err.code === 'ER_BAD_FIELD_ERROR') {
            const sqlIsRead = onlyUnread ? `${base} AND (is_read = 0 OR is_read IS NULL)${group}` : `${base}${group}`;
            return conn.query(sqlIsRead, [user_id], (err2, rows2) => {
                if (err2) return res.status(500).json({ message: 'Failed to load notification types', error: err2.message, sqlTried: [sqlStatus, sqlIsRead] });
                return res.json({ items: rows2 || [] });
            });
        }
        return res.status(500).json({ message: 'Failed to load notification types', error: err.message, sql: sqlStatus });
    });
});

// DELETE /api/notifications/:id
// Delete a single notification
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM notifications WHERE  notification_id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to delete notification', error: err.message, sql: sql });
        res.json(results);
    });
});

// DELETE /api/notifications/user/:user_id
// Delete all notifications for a user
router.delete('/user/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const sql = 'DELETE FROM notifications WHERE user_id = ?';
    conn.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to delete all notifications for user', error: err.message, sql: sql });
        res.json(results);
    });
});

// PUT /api/notifications/:id
// Mark a notification as read (supports status or is_read schema)
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const sql1 = `UPDATE notifications SET status='read' WHERE notification_id = ?`;
    conn.query(sql1, [id], (err, results) => {
        if (!err) return res.json(results);
        // If status column doesn't exist, try fallback to is_read, otherwise auto-add status
        if (err && err.code === 'ER_BAD_FIELD_ERROR') {
            const sql2 = `UPDATE notifications SET is_read = 1 WHERE notification_id = ?`;
            return conn.query(sql2, [id], (err2, results2) => {
                if (!err2) return res.json(results2);
                // Try adding a 'status' column dynamically, then retry sql1
                const alter = `ALTER TABLE notifications ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'unread'`;
                conn.query(alter, (alterErr) => {
                    if (alterErr) {
                        return res.status(500).json({
                            message: 'Failed to mark notification as read: table missing status/is_read columns and could not alter table',
                            error: alterErr.message,
                            tried: { sql1, sql2, alter }
                        });
                    }
                    // Retry the original status update
                    conn.query(sql1, [id], (retryErr, retryRes) => {
                        if (retryErr) {
                            return res.status(500).json({ message: 'Failed to mark notification as read after adding status column', error: retryErr.message, sql: sql1 });
                        }
                        return res.json(retryRes);
                    });
                });
            });
        }
        return res.status(500).json({ message: 'Failed to mark notification as read', error: err.message, sql: sql1 });
    });
});


// POST /api/notifications
// Create a notification (typically admin-triggered)
router.post('/', (req, res) => {
    const { user_id,type,related_id,title,description } = req.body;
    const sql = 'INSERT INTO notifications (user_id,type,related_id,title,description) VALUES (?, ?, ?, ?, ?)';
    conn.query(sql, [user_id, type, related_id, title, description], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to create notification', error: err.message, sql: sql });
        res.json(results);
    });
});

module.exports = router;