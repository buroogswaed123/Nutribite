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

// Test database connection
try {
  db.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      console.error('Database connection error details:', {
        code: err.code,
        errno: err.errno,
        sqlMessage: err.sqlMessage
      });
      return;
    }
    
    // Test query to verify connection
    db.query('SELECT 1', (err, results) => {
      if (err) {
        console.error('Error executing test query:', err);
        console.error('Test query error details:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage
        });
        return;
      }
      console.log('Database connection successful');
      console.log('Test query results:', results);
    });
  });
} catch (err) {
  console.error('Database connection error:', err);
  console.error('Connection error details:', {
    code: err.code,
    errno: err.errno,
    sqlMessage: err.sqlMessage
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.post('/api/login', (req, res) => {
  console.log('Login endpoint hit');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  console.log('Login request received:', { email });
  console.log('Database query:', db.format('SELECT * FROM users WHERE email = ?', [email]));

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
});

const PORT = process.env.PORT || 3001;

// Root route
app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
