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
  try {
    const { username, email, password, user_type } = req.body;
    if (!username || !email || !password || !user_type) {
      console.log('Missing fields:', { username, email, password, user_type });
      return res.status(400).json({ 
        message: 'Missing fields', 
        fields: { username, email, password, user_type }
      });
    }

    console.log('Attempting to register user:', { email, username, user_type });
    
    // Option A: Perform explicit checks to return a specific field for duplicates
    const [emailRows] = await conn.promise().query(
      'SELECT 1 FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (emailRows.length > 0) {
      return res.status(409).json({
        message: 'Email already exists',
        field: 'email',
        code: 'duplicate'
      });
    }

    const [usernameRows] = await conn.promise().query(
      'SELECT 1 FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (usernameRows.length > 0) {
      return res.status(409).json({
        message: 'Username already exists',
        field: 'username',
        code: 'duplicate'
      });
    }

    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Log the query and parameters before execution
    const query = 'INSERT INTO users (email, password_hash, username, user_type, account_creation_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)';
    const params = [email, hashedPassword, username, user_type];
    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const [result] = await conn.promise().query(query, params);
    console.log('Insert result:', result);

    res.status(201).json({
      message: 'User registered successfully',
      user: { 
        user_id: result.insertId, 
        email, 
        username, 
        user_type 
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error details:', {
      code: err.code,
      sql: err.sql,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({
      message: 'Registration failed',
      error: err.message,
      details: {
        code: err.code,
        sql: err.sql,
        sqlMessage: err.sqlMessage
      }
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { identifier, password, loginMethod = 'email' } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    let user;
    if (loginMethod === 'email') {
      user = await findUserByEmail(identifier);
    } else if (loginMethod === 'username') {
      const [rows] = await conn.promise().query('SELECT * FROM users WHERE username = ?', [identifier]);
      user = rows[0];
    } else {
      return res.status(400).json({ message: 'Invalid login method' });
    }

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    const { password_hash, reset_code, reset_code_expires, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error details:', {
      code: err.code,
      sql: err.sql,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Password Reset
router.get('/password-reset/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate a reset code (in a real app, this would be more secure)
    const resetCode = Math.random().toString(36).substring(2, 8);
    
    // Store reset code in database (in a real app, this would have an expiration)
    await conn.promise().query(
      'INSERT INTO password_resets (email, code) VALUES (?, ?)',
      [email, resetCode]
    );

    res.json({ message: 'Reset code sent', resetCode });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Password reset failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { resetCode, newPassword } = req.body;
  if (!resetCode || !newPassword) return res.status(400).json({ message: 'Missing fields' });

  try {
    const [rows] = await conn.promise().query(
      'SELECT email FROM password_resets WHERE code = ?',
      [resetCode]
    );

    if (rows.length === 0) return res.status(400).json({ message: 'Invalid reset code' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await conn.promise().query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, rows[0].email]
    );

    // Clean up the reset code
    await conn.promise().query(
      'DELETE FROM password_resets WHERE code = ?',
      [resetCode]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Password reset failed' });
  }
});

module.exports = router;