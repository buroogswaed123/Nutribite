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
    const sql = 'DELETE FROM notifications WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

//delete all notifications for user
router.delete('/user/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const sql = 'DELETE FROM notifications WHERE user_id = ?';
    conn.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

//mark notification as read
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const sql = `UPDATE notifications SET status='read' WHERE id = ?`;
    conn.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});


//create a notification (for admin only)
router.post('/', (req, res) => {
    const { user_id,type,related_id,title,description } = req.body;
    const sql = 'INSERT INTO notifications (user_id,type,related_id,title,description) VALUES (?, ?, ?, ?, ?)';
    conn.query(sql, [user_id, type, related_id, title, description], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;