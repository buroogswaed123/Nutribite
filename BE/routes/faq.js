const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();

// 1. Add a new question (customer)
router.post('/', async (req, res) => {
  const { user_id, question_text } = req.body;
  if (!user_id || !question_text) return res.status(400).json({ message: 'Missing data' });

  try {
    const [result] = await conn.promise().query(
      'INSERT INTO questions (user_id, question_text) VALUES (?, ?)',
      [user_id, question_text]
    );
    // Return a full object so the FE can render it immediately without re-fetch
    res.json({
      question_id: result.insertId,
      user_id,
      question_text,
      answer_text: null,
      answered: 0,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// 2. Get questions (optionally only answered via query param)
// GET /api/questions?answered=true
router.get('/', async (req, res) => {
  const { answered } = req.query;
  try {
    let sql = 'SELECT * FROM questions';
    const params = [];
    if (typeof answered !== 'undefined') {
      sql += ' WHERE answered = ?';
      params.push(answered === 'true' ? 1 : 0);
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await conn.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// 2. Get all answered questions
router.get('/answered', async (req, res) => {
  try {
    const [rows] = await conn.promise().query('SELECT * FROM questions WHERE answered = TRUE ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// 3. Admin answers a question
router.put('/:id/answer', async (req, res) => {
  const questionId = req.params.id;
  const { answer_text } = req.body;
  if (!answer_text) return res.status(400).json({ message: 'Missing answer' });

  try {
    await conn.promise().query(
      'UPDATE questions SET answer_text = ?, answered = TRUE WHERE question_id = ?',
      [answer_text, questionId]
    );
    // Return updated row
    const [rows] = await conn.promise().query('SELECT * FROM questions WHERE question_id = ?', [questionId]);
    res.json(rows[0] || { success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
