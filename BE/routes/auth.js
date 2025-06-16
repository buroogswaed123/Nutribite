// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../dbSingleton');

// Helper: get DB connection
const conn = db.getConnection();

// Helper: find user by email
const findUserByEmail = async (email) => {
  const [rows] = await conn.promise().query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const [existing] = await conn.promise().query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'Email or username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await conn.promise().query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: result.insertId, username, email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid email or password' });

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;