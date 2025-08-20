const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();



//select all
router.get('/', async (req, res) => {
    try {
        const [rows] = await conn.promise().query('SELECT * FROM diet_type');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'DB error' });
    }
});

//select by diet name
router.get('/', async (req, res) => {
    try {
        const [rows] = await conn.promise().query('SELECT * FROM diet_type WHERE name = ?', ['']);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'DB error' });
    }
});

//select by diet id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await conn.promise().query('SELECT * FROM diet_type WHERE id = ?', [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'DB error' });
    }
});

module.exports = router;
