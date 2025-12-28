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

// Public demo endpoint for auto-assignment (no auth required)
app.post('/api/demo/auto-assign', async (req, res) => {
  try {
    const adminOrdersRoutes = require('./routes/admin/orders');
    // Call the auto-assign logic directly
    const conn = db;
    if (!conn || typeof conn.promise !== 'function') {
      return res.status(500).json({ message: 'DB connection not initialized' });
    }
    const cx = conn.promise();
    const deliveryId = Number(req.body?.delivery_id) || null;

    await cx.beginTransaction();
    const [couriers] = await cx.query(
      `SELECT courier_id, deliveries_assigned
       FROM couriers
       WHERE is_active = 1 AND status IN ('active','on route') AND deliveries_assigned < 10
       ORDER BY deliveries_assigned ASC, courier_id ASC`
    );
    if (!Array.isArray(couriers) || couriers.length === 0) {
      await cx.rollback();
      return res.status(400).json({ message: 'No available couriers' });
    }

    let deliveriesRows;
    if (deliveryId) {
      const [row] = await cx.query(
        `SELECT delivery_id FROM deliveries WHERE delivery_id = ? AND (courier_id IS NULL OR courier_id = 0)`,
        [deliveryId]
      );
      deliveriesRows = Array.isArray(row) ? row : [];
    } else {
      const [rows] = await cx.query(
        `SELECT delivery_id FROM deliveries WHERE (courier_id IS NULL OR courier_id = 0) ORDER BY delivery_id ASC`
      );
      deliveriesRows = rows;
    }

    if (!Array.isArray(deliveriesRows) || deliveriesRows.length === 0) {
      await cx.commit();
      return res.json({ assigned: 0, message: 'No unassigned deliveries' });
    }

    let assigned = 0;
    let idx = 0;
    for (const d of deliveriesRows) {
      let tries = 0;
      while (tries < couriers.length && couriers[idx].deliveries_assigned >= 10) {
        idx = (idx + 1) % couriers.length;
        tries++;
      }
      if (couriers[idx].deliveries_assigned >= 10) break;
      const cid = couriers[idx].courier_id;
      const [upd] = await cx.query(
        `UPDATE deliveries SET courier_id = ?, status = 'on route' WHERE delivery_id = ? AND (courier_id IS NULL OR courier_id = 0)`,
        [cid, d.delivery_id]
      );
      if (upd && upd.affectedRows > 0) {
        await cx.query(
          `UPDATE couriers SET deliveries_assigned = deliveries_assigned + 1, status = 'on route' WHERE courier_id = ?`,
          [cid]
        );
        couriers[idx].deliveries_assigned += 1;
        assigned += 1;
        idx = (idx + 1) % couriers.length;
      }
    }

    await cx.commit();
    return res.json({ assigned, message: `Successfully assigned ${assigned} deliveries` });
  } catch (err) {
    console.error('DEMO AUTO-ASSIGN ERROR:', err);
    return res.status(500).json({ message: 'Error auto-assigning deliveries', error: err.message });
  }
});

const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

const messagesRoutes = require('./routes/messages');
app.use('/api/messages', requireActiveUser, messagesRoutes);

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
// Auto-assign scheduler (every ~2 minutes)
// Assign unassigned deliveries that are within 0–60 minutes of desired time
// to the least-loaded active courier (capacity < 10).
// ========================
const AUTO_ASSIGN_INTERVAL_MS = 2 * 60 * 1000;
async function autoAssignTick() {
  try {
    // 1) Find unassigned deliveries within window
    const sqlFind = `
      SELECT d.delivery_id
      FROM deliveries d
      JOIN orders o ON o.order_id = d.order_id
      WHERE (d.courier_id IS NULL OR d.courier_id = 0)
        AND TIMESTAMPDIFF(MINUTE, NOW(), o.set_delivery_time) BETWEEN 0 AND 60
      ORDER BY o.set_delivery_time ASC
      LIMIT 100`;
    const findRows = await new Promise((resolve, reject) => {
      db.query(sqlFind, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    if (!Array.isArray(findRows) || findRows.length === 0) return;

    for (const r of findRows) {
      const deliveryId = r.delivery_id;
      // 2) Pick least-loaded active courier with capacity
      const sqlPick = `
        SELECT courier_id, deliveries_assigned
        FROM couriers
        WHERE is_active = 1 AND status IN ('active','on route') AND deliveries_assigned < 10
        ORDER BY deliveries_assigned ASC, courier_id ASC
        LIMIT 1`;
      const pick = await new Promise((resolve, reject) => {
        db.query(sqlPick, (err, rows) => err ? reject(err) : resolve(Array.isArray(rows) && rows[0] ? rows[0] : null));
      });
      if (!pick) break; // no available couriers

      // 3) Assign delivery if still unassigned
      const sqlAssign = `
        UPDATE deliveries
        SET courier_id = ?, status = 'on route'
        WHERE delivery_id = ? AND (courier_id IS NULL OR courier_id = 0)`;
      const assignRes = await new Promise((resolve, reject) => {
        db.query(sqlAssign, [pick.courier_id, deliveryId], (err, res) => err ? reject(err) : resolve(res));
      });
      if (assignRes && assignRes.affectedRows > 0) {
        // 4) Bump courier load and ensure status
        await new Promise((resolve, reject) => {
          db.query(
            `UPDATE couriers SET deliveries_assigned = deliveries_assigned + 1, status = 'on route' WHERE courier_id = ?`,
            [pick.courier_id],
            (err) => err ? reject(err) : resolve()
          );
        });
        // 5) Notify courier about new assignment (best-effort)
        try {
          const orderRow = await new Promise((resolve, reject) => {
            db.query(
              `SELECT o.order_id FROM deliveries d JOIN orders o ON o.order_id = d.order_id WHERE d.delivery_id = ? LIMIT 1`,
              [deliveryId],
              (err, rows) => err ? reject(err) : resolve(Array.isArray(rows) && rows[0] ? rows[0] : null)
            );
          });
          const orderId = orderRow && orderRow.order_id;
          const userRow = await new Promise((resolve, reject) => {
            db.query(
              `SELECT user_id FROM couriers WHERE courier_id = ? LIMIT 1`,
              [pick.courier_id],
              (err, rows) => err ? reject(err) : resolve(Array.isArray(rows) && rows[0] ? rows[0] : null)
            );
          });
          const userId = userRow && userRow.user_id;
          if (userId) {
            const title = 'שויך לך משלוח חדש';
            const description = orderId ? `הזמנה #${orderId} הוקצתה אליך` : `הוקצתה אליך משימה חדשה (משלוח #${deliveryId})`;
            await new Promise((resolve, reject) => {
              db.query(
                'INSERT INTO notifications (user_id, type, related_id, title, description) VALUES (?, "order", ?, ?, ?)',
                [userId, orderId || deliveryId, title, description],
                (err) => err ? reject(err) : resolve()
              );
            });
          }
        } catch (_) { /* ignore */ }
      }
    }

    // 6) Send ~60-minute reminder for assigned deliveries not yet delivered
    try {
      const remindRows = await new Promise((resolve, reject) => {
        db.query(
          `SELECT d.delivery_id, d.courier_id, o.order_id
           FROM deliveries d
           JOIN orders o ON o.order_id = d.order_id
           WHERE d.courier_id IS NOT NULL
             AND d.status IN ('assigned','on route')
             AND TIMESTAMPDIFF(MINUTE, NOW(), o.set_delivery_time) BETWEEN 55 AND 60`,
          (err, rows) => err ? reject(err) : resolve(rows || [])
        );
      });
      for (const row of remindRows) {
        const userRow = await new Promise((resolve, reject) => {
          db.query(
            `SELECT user_id FROM couriers WHERE courier_id = ? LIMIT 1`,
            [row.courier_id],
            (err, rows) => err ? reject(err) : resolve(Array.isArray(rows) && rows[0] ? rows[0] : null)
          );
        });
        const userId = userRow && userRow.user_id;
        if (!userId) continue;
        // check if a reminder for this delivery was already sent
        const exists = await new Promise((resolve, reject) => {
          db.query(
            `SELECT 1 FROM notifications WHERE user_id = ? AND type = 'courier' AND related_id = ? LIMIT 1`,
            [userId, row.delivery_id],
            (err, rows) => err ? reject(err) : resolve(Array.isArray(rows) && rows.length > 0)
          );
        });
        if (exists) continue;
        await new Promise((resolve, reject) => {
          db.query(
            `INSERT INTO notifications (user_id, type, related_id, title, description)
             VALUES (?, 'courier', ?, ?, ?)`,
            [userId, row.delivery_id, 'תזכורת משלוח', `כ-60 דקות לפני יעד ההספקה להזמנה #${row.order_id}`],
            (err) => err ? reject(err) : resolve()
          );
        });
      }
    } catch (_) { /* ignore reminders errors */ }
  } catch (e) {
    console.error('Auto-assign scheduler error:', e);
  }
}
setInterval(() => { autoAssignTick().catch(() => {}); }, AUTO_ASSIGN_INTERVAL_MS);

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