// FAQ routes (questions and answers)
const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();

// POST /api/questions
// Add a new question (customer)
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

// GET /api/questions
// List questions with optional filters: answered, public, q (text)
router.get('/', async (req, res) => {
  const { answered, public: pub, q } = req.query;
  try {
    let sql = 'SELECT * FROM questions';
    const params = [];
    const where = [];

    if (typeof answered !== 'undefined') {
      where.push('answered = ?');
      params.push(String(answered) === 'true' ? 1 : 0);
    }
    if (typeof pub !== 'undefined') {
      // escape column name `public` in case of naming conflicts
      where.push('`public` = ?');
      params.push(String(pub) === 'true' ? 1 : 0);
    }
    if (q && String(q).trim()) {
      where.push('question_text LIKE ?');
      params.push(`%${String(q).trim()}%`);
    }

    if (where.length) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await conn.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/questions/answered
// List only answered questions (shortcut)
router.get('/answered', async (req, res) => {
  try {
    const [rows] = await conn.promise().query('SELECT * FROM questions WHERE answered = TRUE ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/questions/:id/answer
// Admin answers a question and notifies the owner (best-effort)
router.put('/:id/answer', async (req, res) => {
  const questionId = req.params.id;
  const { answer_text } = req.body;
  if (!answer_text) return res.status(400).json({ message: 'Missing answer' });

  try {
    await conn.promise().query(
      'UPDATE questions SET answer_text = ?, answered = TRUE WHERE question_id = ?',
      [answer_text, questionId]
    );
    // Return updated row and notify question owner
    const [rows] = await conn.promise().query('SELECT * FROM questions WHERE question_id = ?', [questionId]);
    const updated = rows[0] || { success: true };
    // Create notification to the question's user (best-effort)
    try {
      if (updated && updated.user_id) {
        const title = 'התשובה לשאלתך זמינה';
        const description = `השאלה: ${String(updated.question_text || '').slice(0, 120)}`;
        await conn.promise().query(
          'INSERT INTO notifications (user_id, type, related_id, title, description) VALUES (?, ?, ?, ?, ?)',
          [updated.user_id, 'faq_answer', questionId, title, description]
        );
      }
    } catch (notifyErr) {
      // Swallow notification errors to not block answering
      console.warn('FAQ notify failed:', notifyErr?.message || notifyErr);
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PATCH /api/questions/:id/visibility  { public: true|false }
// Update question visibility (admin)
router.patch('/:id/visibility', async (req, res) => {
  const questionId = Number(req.params.id);
  if (!Number.isFinite(questionId)) {
    return res.status(400).json({ message: 'Invalid question id' });
  }

  const body = req.body || {};
  if (!('public' in body)) {
    return res.status(400).json({ message: 'Missing public flag' });
  }

  const pub = body.public;
  const pubVal = (pub === true || pub === 1 || String(pub) === 'true') ? 1 : 0;

  try {
    await conn.promise().query('UPDATE questions SET `public` = ? WHERE question_id = ?', [pubVal, questionId]);
    const [rows] = await conn.promise().query('SELECT * FROM questions WHERE question_id = ?', [questionId]);
    return res.json(rows[0] || { success: true, question_id: questionId, public: !!pubVal });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'DB error' });
  }
});

// Export router
module.exports = router;
