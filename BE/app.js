const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = 3000;

// DB connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nutribite_db'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Initialize database schema
const initDatabase = () => {
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      user_type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createUserTable, (err) => {
    if (err) {
      console.error('Error initializing database:', err);
      return;
    }
    console.log('Database initialized successfully');
  });
};

// Initialize database when server starts
initDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'someSecretHere123',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 30, // 30 mins
    sameSite: 'strict'
  }
}));

// Routes

app.get('/', (req, res) => {
  res.send('Backend is running.');
});

app.post('/api/register', (req, res) => {
  const { email, password, username, user_type } = req.body;
  if (!email || !password || !username || !user_type)
    return res.status(400).json({ error: 'Missing fields' });

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (results.length > 0)
      return res.status(400).json({ error: 'User already exists' });

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: 'Hash error' });

      db.query('INSERT INTO users (email, password, username, user_type) VALUES (?, ?, ?, ?)',
        [email, hash, username, user_type],
        (err) => {
          if (err) return res.status(500).json({ error: 'DB insert error' });

          req.session.isAuthenticated = true;
          req.session.user = email;
          res.json({ success: true, user: { email, username, user_type } });
        });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Missing fields' });

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (results.length === 0)
      return res.status(401).json({ error: 'User not found' });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ error: 'Compare error' });
      if (!match) return res.status(401).json({ error: 'Invalid password' });

      req.session.isAuthenticated = true;
      req.session.user = user.email;
      res.json({ success: true, user: { email: user.email, username: user.username, user_type: user.user_type } });
    });
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
