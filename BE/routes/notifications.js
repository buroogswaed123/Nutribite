const express = require('express');
const dbSingleton=require('../dbSingleton');
const conn=dbSingleton.getConnection();
const router = express.Router();



//get all notifications for user
router.get('/user/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const sql = 'SELECT * FROM notifications WHERE user_id = ?';
    conn.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

//delete notification
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM notifications WHERE  notification_id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to delete notification', error: err.message, sql: sql });
        res.json(results);
    });
});

//delete all notifications for user
router.delete('/user/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const sql = 'DELETE FROM notifications WHERE user_id = ?';
    conn.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to delete all notifications for user', error: err.message, sql: sql });
        res.json(results);
    });
});

//mark notification as read
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


//create a notification (for admin only)
router.post('/', (req, res) => {
    const { user_id,type,related_id,title,description } = req.body;
    const sql = 'INSERT INTO notifications (user_id,type,related_id,title,description) VALUES (?, ?, ?, ?, ?)';
    conn.query(sql, [user_id, type, related_id, title, description], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to create notification', error: err.message, sql: sql });
        res.json(results);
    });
});

module.exports = router;