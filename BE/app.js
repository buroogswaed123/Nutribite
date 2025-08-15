const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
// No external OAuth libs; manual flow

const app = express();
const PORT = process.env.PORT || 3000;

// DB connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nutribite_db',
  port: 3306,
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    console.error('Connection config:', {
      host: 'localhost',
      user: 'root',
      database: 'nutribite_db',
      port: 3306
    });
    return;
  }
  console.log('Connected to MySQL');
  
  // Test connection
  db.query('SELECT 1', (err, results) => {
    if (err) {
      console.error('Test query failed:', err);
    } else {
      console.log('Test query successful:', results);
    }
  });
});

// Handle connection errors
db.on('error', (err) => {
  console.error('Database connection error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Connection lost, attempting to reconnect...');
    db.connect();
  } else if (err.fatal) {
    console.error('Fatal error, stopping server...');
    process.exit(1);
  }
});

// Handle connection timeout
db.on('timeout', () => {
  console.error('Database connection timeout, attempting to reconnect...');
  db.connect();
});

// Handle connection close
db.on('close', () => {
  console.log('Database connection closed');
});

// Initialize database schema
const initDatabase = () => {
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      user_type VARCHAR(50) NOT NULL,
      account_creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reset_code VARCHAR(10),
      reset_code_expires TIMESTAMP,
      username VARCHAR(255) NOT NULL
    )
  `;

  const createPasswordResetsTable = `
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY email_code_unique (email, code)
    )
  `;

  // Create tables sequentially with better error handling
  db.query(createUserTable, async (err) => {
    if (err) {
      console.error('Error creating users table:', err);
      console.error('Error details:', {
        code: err.code,
        sql: err.sql,
        sqlMessage: err.sqlMessage,
        errno: err.errno
      });
      return;
    }

    console.log('Users table created successfully');

    db.query(createPasswordResetsTable, (err) => {
      if (err) {
        console.error('Error creating password_resets table:', err);
        console.error('Error details:', {
          code: err.code,
          sql: err.sql,
          sqlMessage: err.sqlMessage,
          errno: err.errno
        });
        return;
      }

      console.log('Password resets table created successfully');
      console.log('Database initialized successfully');
    });
  });
};

// Test database connection
app.get('/test-db', (req, res) => {
  db.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      console.error('Database test failed:', err);
      console.error('Error details:', {
        code: err.code,
        sql: err.sql,
        sqlMessage: err.sqlMessage,
        errno: err.errno
      });
      res.status(500).json({ 
        error: 'Database test failed', 
        details: {
          code: err.code,
          sql: err.sql,
          sqlMessage: err.sqlMessage,
          errno: err.errno
        }
      });
    } else {
      console.log('Database test successful:', results);
      res.json({ success: true, results });
    }
  });
});

// Test table existence
app.get('/test-tables', (req, res) => {
  db.query(
    'DESCRIBE users',
    (err, results) => {
      if (err) {
        console.error('Users table test failed:', err);
        res.status(500).json({ 
          error: 'Users table test failed', 
          details: {
            code: err.code,
            sql: err.sql,
            sqlMessage: err.sqlMessage,
            errno: err.errno
          }
        });
      } else {
        console.log('Users table structure:', results);
        res.json({ success: true, tableStructure: results });
      }
    }
  );
});

// Initialize database when server starts
initDatabase();

// Middleware
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));
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

// Import routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);
const oauthRoutes = require('./routes/oauth');
app.use('/auth', oauthRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

// Test route to check if server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Mock sales data
const salesData = [
  { date: "2025-08-01", salesQuantity: 10, productsSold: 7 },
  { date: "2025-08-02", salesQuantity: 15, productsSold: 10 },
  { date: "2025-08-03", salesQuantity: 7, productsSold: 5 },
];

// Endpoint
app.get('/api/admin/sales', (req, res) => {
  res.json(salesData);
});



// Export server for testing
module.exports = server;
