// ========================
// Core & Libraries
// ========================
const express = require('express');
// Load env vars from .env (local dev)
try {
  require('dotenv').config();
} catch (_) {}
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const path = require("path");


// ========================
// App & Config
// ========================
const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ========================
// DB Connection
// ========================
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

// ========================
// Helpers
// ========================
const formatDbError = (err) => ({
  code: err?.code,
  sql: err?.sql,
  sqlMessage: err?.sqlMessage,
  errno: err?.errno,
});

// ========================
// Initialize database schema
// ========================
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
      console.error('Error details:', formatDbError(err));
      return;
    }

    // Ensure profile_image column exists
    db.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_image'",
      (colErr, rows) => {
        if (colErr) {
          console.error('Error checking profile_image column:', formatDbError(colErr));
        } else if (rows && rows[0] && rows[0].cnt === 0) {
          db.query("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULL", (altErr) => {
            if (altErr) {
              console.error('Error adding profile_image column:', formatDbError(altErr));
            } 
          });
        }
      }
    );

    db.query(createPasswordResetsTable, (err) => {
      if (err) {
        console.error('Error creating password_resets table:', err);
        console.error('Error details:', formatDbError(err));
        return;
      }

      console.log('Database initialized successfully');
    });
  });
};

// ========================
// Diagnostics & Test Endpoints
// ========================
app.get('/test-db', (req, res) => {
  db.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      console.error('Database test failed:', err);
      console.error('Error details:', formatDbError(err));
      res.status(500).json({ 
        error: 'Database test failed', 
        details: formatDbError(err)
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
          details: formatDbError(err)
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

// ========================
// Middleware
// ========================
// Allow multiple dev origins via whitelist
const DEV_ORIGINS = ['http://localhost:3001', 'http://localhost:5173'];
const CORS_WHITELIST = Array.from(new Set([FRONTEND_ORIGIN, ...DEV_ORIGINS].filter(Boolean)));

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser clients with no Origin
    if (!origin) return cb(null, true);
    if (CORS_WHITELIST.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// Handle preflight for all routes
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'someSecretHere123',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 30, // 30 mins
    sameSite: 'lax'
  }
}));

// ========================
// Routes Registration
// ========================
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Admin routes: mount auth publicly, and protect the rest
const requireActiveUser = require('./middleware/requireActiveUser');
const requireAdmin = require('./middleware/requireAdmin');
const adminAuthRoutes = require('./routes/admin/auth');
app.use('/api/admin/auth', adminAuthRoutes); // no requireAdmin on /login
const adminIndexRoutes = require('./routes/admin');
app.use('/api/admin', requireActiveUser, requireAdmin, adminIndexRoutes);

const customersRoutes = require('./routes/customers');
app.use('/api/customers', customersRoutes);
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);
// Diet & Recipes routes
try {
  const dietRoutes = require('./routes/diet');
  app.use('/api/diet', dietRoutes);
  console.log('Mounted /api/diet routes');
} catch (e) {
  console.error('Failed to mount /api/diet routes:', e?.message || e);
}
try {
  const recipesRoutes = require('./routes/recipes');
  app.use('/api/recipes', recipesRoutes);
  console.log('Mounted /api/recipes routes');
} catch (e) {
  console.error('Failed to mount /api/recipes routes:', e?.message || e);
}
// Public menu routes
try {
  const menuRoutes = require('./routes/menu');
  app.use('/api/menu', menuRoutes);
  console.log('Mounted /api/menu routes');
} catch (e) {
  console.error('Failed to mount /api/menu routes:', e?.message || e);
}
// Questions/FAQ routes
try {
  const questionsRoutes = require('./routes/faq');
  app.use('/api/questions', questionsRoutes);
  console.log('Mounted /api/questions routes');
} catch (e) {
  console.error('Failed to mount /api/questions routes:', e?.message || e);
}

// Serve uploaded files (profile images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Routes
app.get('/', (req, res) => {
  res.send('Backend is running.');
});



// ========================
// Error handling
// ========================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// ========================
// Startup
// ========================
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ========================
// Graceful shutdown
// ========================
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

// Endpoint (example)
app.get('/api/admin/sales', (req, res) => {
  res.json(salesData);
});


//use the photos folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Export server for testing
module.exports = server;
