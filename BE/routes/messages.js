const express = require('express');
const db = require('../dbSingleton');
const router = express.Router();

const conn = db.getConnection && db.getConnection();
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

// GET /api/messages/init - Initialize messages table
router.get('/init', async (req, res) => {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_sender (sender_id),
        INDEX idx_receiver (receiver_id),
        INDEX idx_created (created_at)
      )
    `);
    return res.json({ success: true, message: 'Messages table created' });
  } catch (err) {
    console.error('Init messages table error:', err);
    return res.status(500).json({ message: 'Failed to create table', error: err.message });
  }
});

// GET /api/messages/all-conversations
// Get list of all user IDs that have conversations with current user
router.get('/all-conversations', async (req, res) => {
  try {
    const currentUserId = req.session?.user?.user_id || req.user?.user_id;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });

    const [rows] = await runQuery(
      `SELECT DISTINCT 
        CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as user_id
       FROM messages
       WHERE sender_id = ? OR receiver_id = ?`,
      [currentUserId, currentUserId, currentUserId]
    );

    const userIds = rows.map(r => r.user_id);
    return res.json(userIds);
  } catch (err) {
    console.error('GET all conversations error:', err);
    return res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/conversation/:userId
// Get conversation between current user and another user
router.get('/conversation/:userId', async (req, res) => {
  try {
    const currentUserId = req.session?.user?.user_id || req.user?.user_id;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });

    const otherUserId = parseInt(req.params.userId);
    
    const [rows] = await runQuery(
      `SELECT m.*, 
        sender.username as sender_name, 
        receiver.username as receiver_name
       FROM messages m
       JOIN users sender ON m.sender_id = sender.user_id
       JOIN users receiver ON m.receiver_id = receiver.user_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('GET conversation error:', err);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// POST /api/messages
// Send a new message
router.post('/', async (req, res) => {
  try {
    const currentUserId = req.session?.user?.user_id || req.user?.user_id;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });

    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) {
      return res.status(400).json({ message: 'receiver_id and message are required' });
    }

    const [result] = await runQuery(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [currentUserId, receiver_id, message]
    );

    const [newMessage] = await runQuery(
      `SELECT m.*, 
        sender.username as sender_name, 
        receiver.username as receiver_name
       FROM messages m
       JOIN users sender ON m.sender_id = sender.user_id
       JOIN users receiver ON m.receiver_id = receiver.user_id
       WHERE m.message_id = ?`,
      [result.insertId]
    );

    return res.status(201).json(newMessage[0]);
  } catch (err) {
    console.error('POST message error:', err);
    return res.status(500).json({ message: 'Failed to send message' });
  }
});

// PATCH /api/messages/:messageId/read
// Mark message as read
router.patch('/:messageId/read', async (req, res) => {
  try {
    const currentUserId = req.session?.user?.user_id || req.user?.user_id;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });

    await runQuery(
      'UPDATE messages SET is_read = TRUE WHERE message_id = ? AND receiver_id = ?',
      [req.params.messageId, currentUserId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH message read error:', err);
    return res.status(500).json({ message: 'Failed to mark as read' });
  }
});

module.exports = router;
