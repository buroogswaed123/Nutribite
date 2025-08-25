const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();



// GET /api/diet/types -> normalized payload: { items: [{ id, name }] }
router.get('/types', async (req, res) => {
  try {
    const [rows] = await conn.promise().query('SELECT diet_id AS id, name FROM diet_type ORDER BY diet_id ASC');
    return res.json({ items: rows });
  } catch (err) {
    console.error('DIET TYPES LIST ERROR:', err);
    return res.status(500).json({ success: false, message: 'DB error' });
  }
});

// Optional: select by diet name
router.get('/by-name/:name', async (req, res) => {
  try {
    const [rows] = await conn.promise().query('SELECT diet_id AS id, name FROM diet_type WHERE name = ? LIMIT 1', [req.params.name]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('DIET BY NAME ERROR:', err);
    return res.status(500).json({ success: false, message: 'DB error' });
  }
});

//select by diet id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await conn.promise().query('SELECT diet_id AS id, name FROM diet_type WHERE diet_id = ? LIMIT 1', [req.params.id]);
        if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'DB error' });
    }
});

module.exports = router;
