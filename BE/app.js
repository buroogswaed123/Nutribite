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
let compression;
try { compression = require('compression'); }
catch (e) { console.warn('compression not installed; skipping response compression'); }


// ========================
// App & Config
// ========================
const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');


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

// Optional: dev SQL timing logs. Enable with SQL_LOG=1
try {
  if (String(process.env.SQL_LOG || '').trim() === '1') {
    const origQuery = db.query.bind(db);
    db.query = function patchedQuery(sql, values, cb) {
      const start = Date.now();
      const log = (finalSql) => {
        const ms = Date.now() - start;
        const txt = typeof finalSql === 'string' ? finalSql : (finalSql && finalSql.sql) || '';
        // collapse whitespace and truncate to avoid huge logs
        const oneLine = String(txt).replace(/\s+/g, ' ').trim().slice(0, 300);
        console.log(`[SQL ${ms}ms] ${oneLine}`);
      };
      // Support signatures: (sql, cb) and (sql, values, cb)
      if (typeof values === 'function') {
        const userCb = values;
        return origQuery(sql, function(err, results, fields) {
          try { log(sql); } catch(_) {}
          return userCb(err, results, fields);
        });
      }
      return origQuery(sql, values, function(err, results, fields) {
        try { log(sql); } catch(_) {}
        if (typeof cb === 'function') return cb(err, results, fields);
      });
    };
    console.log('SQL_LOG enabled: query timings will be printed');
  }
} catch (e) {
  console.warn('Failed to enable SQL logging:', e?.message || e);
}

 

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
  console.log('starting server..');
  
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

    // Ensure last_seen column exists (for simple presence)
    db.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen'",
      (colErr, rows) => {
        if (colErr) {
          console.error('Error checking last_seen column:', formatDbError(colErr));
        } else if (rows && rows[0] && rows[0].cnt === 0) {
          db.query("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL", (altErr) => {
            if (altErr) {
              console.error('Error adding last_seen column:', formatDbError(altErr));
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
      // Ensure cart_items table exists
      const createCartItemsTable = `
        CREATE TABLE IF NOT EXISTS cart_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          price DECIMAL(10, 2) NOT NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `;
      db.query(createCartItemsTable, (cartErr) => {
        if (cartErr) {
          console.error('Error creating cart_items table:', formatDbError(cartErr));
          return;
        }
        console.log('Database initialized successfully');
      });
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
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5173'].map(url => url.replace(/\/$/, ''));
const CORS_WHITELIST = Array.from(new Set([FRONTEND_ORIGIN, ...DEV_ORIGINS].filter(Boolean)));
// Allow any LAN IP (e.g., 192.168.x.x) on common dev ports (3000/3001/5173)
const ALLOW_LAN_DEV = /^http:\/\/(?:localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}):(3000|3001|5173)$/i;

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser clients with no Origin
    if (!origin) return cb(null, true);
    const o = origin.replace(/\/$/, ''); // strip a trailing '/'
    if (CORS_WHITELIST.includes(o)) return cb(null, true);
    if (ALLOW_LAN_DEV.test(o)) return cb(null, true);
    console.warn('CORS blocked Origin:', origin);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// Handle preflight for all routes
app.options('*', cors());
// Enable gzip/deflate compression for faster responses (especially static assets), if available
if (compression) {
  app.use(compression());
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Optional persistent session store using MySQL; falls back to MemoryStore if not available
let sessionStore = undefined;
try {
  const MySQLStore = require('express-mysql-session')(session);
  sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'nutribite_db',
    clearExpired: true,
    checkExpirationInterval: 1000 * 60 * 15, // prune every 15m
    expiration: 1000 * 60 * 60 * 24 * 7, // 7 days
    createDatabaseTable: true
  });
} catch (e) {
  console.warn('express-mysql-session not installed; using in-memory session store for dev. To persist sessions, install it: npm i express-mysql-session');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'someSecretHere123',
  resave: false,
  saveUninitialized: false, // avoid setting empty sessions
  rolling: true,            // refresh cookie on each response
  store: sessionStore,      // may be undefined; express-session will use MemoryStore
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 30, // 30 mins, refreshed by rolling
    sameSite: 'lax',
    secure: false           // set true behind HTTPS/proxy in prod
  }
}));

// Simple debug endpoint to view session + /api/me resolution (registered after session middleware)
app.get('/api/debug/session', (req, res) => {
  const sessionUserId = req?.session?.user_id ?? null;
  res.json({
    session_user_id: sessionUserId,
    has_session: !!sessionUserId,
    cookies: Object.keys(req.cookies || {}),
    headers_origin: req.headers.origin || null
  });
});

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

const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

const customersRoutes = require('./routes/customers');
app.use('/api/customers', customersRoutes);
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);
// Orders routes
try {
  const ordersRoutes = require('./routes/orders');
  app.use('/api/orders', requireActiveUser, ordersRoutes);
} catch (e) {
  console.error('Failed to mount /api/orders routes:', e?.message || e);
}
// Cart routes
try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', requireActiveUser, cartRoutes);
} catch (e) {
  console.error('Failed to mount /api/cart routes:', e?.message || e);
}
// Courier routes
try {
  const courierRoutes = require('./routes/courier');
  app.use('/api/courier', requireActiveUser, courierRoutes);
  // console.log('Mounted /api/courier routes');
} catch (e) {
  console.error('Failed to mount /api/courier routes:', e?.message || e);
  if (e && e.stack) console.error('Stack:', e.stack);
  try { console.error('Full error object:', JSON.stringify(e)); } catch (_) { /* ignore */ }
}
// Diet & Recipes routes
try {
  const dietRoutes = require('./routes/diet');
  app.use('/api/diet', dietRoutes);
  // console.log('Mounted /api/diet routes');
} catch (e) {
  console.error('Failed to mount /api/diet routes:', e?.message || e);
}
try {
  const recipesRoutes = require('./routes/recipes');
  app.use('/api/recipes', recipesRoutes);
  //console.log('Mounted /api/recipes routes');
} catch (e) {
  console.error('Failed to mount /api/recipes routes:', e?.message || e);
}
// Public menu routes
try {
  const menuRoutes = require('./routes/menu');
  app.use('/api/menu', menuRoutes);
  //console.log('Mounted /api/menu routes');
} catch (e) {
  console.error('Failed to mount /api/menu routes:', e?.message || e);
}
// Questions/FAQ routes
try {
  const questionsRoutes = require('./routes/faq');
  app.use('/api/questions', questionsRoutes);
  //console.log('Mounted /api/questions routes');
} catch (e) {
  console.error('Failed to mount /api/questions routes:', e?.message || e);
}

try {
  const planRoutes = require('./routes/plan');
  const requireActiveUser2 = require('./middleware/requireActiveUser');
  app.use('/api/plan', requireActiveUser2, planRoutes);
  //console.log('Mounted /api/plan routes');
} catch (e) {
  console.error('Failed to mount /api/plan routes:', e?.message || e);
  if (e && e.stack) console.error('Stack:', e.stack);
  try { console.error('Full error object:', JSON.stringify(e)); } catch (_) { /* ignore */ }
}

// Serve uploaded files (profile images, etc.) with caching
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  maxAge: '30d',
  etag: true,
  immutable: true,
}));

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
// Bind on 0.0.0.0 so phones on your LAN can reach the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// ========================
// Graceful shutdown
// ========================
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  try { console.error('Details:', formatDbError(reason)); } catch (_) {}
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  try { console.error('Details:', formatDbError(err)); } catch (_) {}
});

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

  // Export server for testing
  module.exports = server;