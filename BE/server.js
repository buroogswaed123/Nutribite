const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nutribite_db'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 30 // 30 minutes
  }
}));

// API routes
app.use('/api', express.Router()
  .post('/login', (req, res) => {
    const { email, password } = req.body;

    console.log('Login request received:', { email });
    console.log('Database query:', db.format('SELECT * FROM users WHERE email = ?', [email]));

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Query the database for the user
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      if (results.length === 0) {
        console.log('No user found with email:', email);
        return res.status(401).json({ error: 'User not found' });
      }

      const user = results[0];
      console.log('Found user:', user.email);
      console.log('Database password:', user.password);
      console.log('Submitted password:', password);

      // Compare plain text password
      if (user.password !== password) {
        console.log('Password mismatch for user:', user.email);
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Set session
      req.session.isAuthenticated = true;
      req.session.user = user.email;
      
      console.log('Login successful for user:', user.email);
      res.json({ success: true, user: { email: user.email, username: user.username, user_type: user.user_type } });
    });
  })
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
