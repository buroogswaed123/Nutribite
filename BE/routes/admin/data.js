//get all data of everything

const express = require('express');
const db = require('../../dbSingleton');
const router = express.Router();

//helper
const conn = db.getConnection && db.getConnection();
const runQuery = async (sql, params = []) => {
  if (!conn) throw new Error('DB connection not initialized');
  if (typeof conn.promise === 'function') return conn.promise().query(sql, params);
  if (typeof conn.query === 'function') {
    return new Promise((resolve, reject) => {
      conn.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }
  throw new Error('Unsupported DB client on connection');
};


//get total number of orders this month
router.get('/orders_this_month', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT COUNT(*) AS total_orders FROM orders WHERE MONTH(set_delivery_time) = MONTH(CURRENT_DATE()) AND YEAR(set_delivery_time) = YEAR(CURRENT_DATE())');
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS THIS MONTH GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting orders this month', error: err.message });
  }
});
//get total number of users (renamed to avoid conflict with full users list)
router.get('/metrics/users_count', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT COUNT(*) AS total_users FROM users');
    return res.json(rows[0] || rows);
  } catch (err) {
    console.error('ADMIN USERS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting users', error: err.message });
  }
});
//get all couriers
router.get('/couriers', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM couriers');
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting couriers', error: err.message });
  }
});

//get all customers 
router.get('/customers', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM customers');
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN CUSTOMERS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting customers', error: err.message });
  }
});

//get users (optionally recent with limit)
router.get('/users', async (req, res) => {
  try {
    const { limit } = req.query;
    if (limit) {
      // Provide aliases to match FE expectations
      const lim = Math.max(1, Math.min(parseInt(limit, 10) || 5, 50));
      const sql = `
        SELECT 
          user_id,
          username,
          email,
          user_type,
          account_creation_time AS created_at,
          last_seen,
          CASE WHEN last_seen IS NOT NULL AND last_seen >= (NOW() - INTERVAL 2 MINUTE) THEN 1 ELSE 0 END AS is_online
        FROM users
        ORDER BY account_creation_time DESC
        LIMIT ?
      `;
      const [rows] = await runQuery(sql, [lim]);
      return res.json(rows);
    }
    const sqlAll = `
      SELECT 
        user_id,
        username,
        email,
        user_type,
        account_creation_time AS created_at,
        last_seen,
        CASE WHEN last_seen IS NOT NULL AND last_seen >= (NOW() - INTERVAL 2 MINUTE) THEN 1 ELSE 0 END AS is_online
      FROM users
      ORDER BY account_creation_time DESC
    `;
    const [rows] = await runQuery(sqlAll);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN USERS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting users', error: err.message });
  }
});
//get the sum of all orders this month
router.get('/orders_sum_this_month', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT SUM(total) AS total_orders FROM orders WHERE MONTH(set_delivery_time) = MONTH(CURRENT_DATE()) AND YEAR(set_delivery_time) = YEAR(CURRENT_DATE())');
    return res.json(rows[0] || rows);
  } catch (err) {
    console.error('ADMIN ORDERS SUM THIS MONTH GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting orders sum this month', error: err.message });
  }
});

// ========================
// Metrics with optional from/to filters
// ========================

// helper to build date filter SQL
const buildDateRangeFilter = (from, to, column = 'set_delivery_time') => {
  if (from && to) return { clause: `DATE(${column}) BETWEEN ? AND ?`, params: [from, to] };
  // default: current month
  return { clause: `MONTH(${column}) = MONTH(CURRENT_DATE()) AND YEAR(${column}) = YEAR(CURRENT_DATE())`, params: [] };
};

// overview metrics
router.get('/metrics/overview', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = buildDateRangeFilter(from, to, 'o.set_delivery_time');
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM customers) AS customers_count,
        (SELECT COUNT(*) FROM couriers) AS couriers_count,
        (SELECT COUNT(*) FROM orders o WHERE ${dateFilter.clause}) AS orders_count,
        (SELECT IFNULL(SUM(o.total), 0) FROM orders o WHERE ${dateFilter.clause}) AS orders_sum,
        (SELECT COUNT(*) FROM deliveries d WHERE d.status = 'assigned') AS assigned_count,
        (SELECT COUNT(*) FROM deliveries d WHERE d.status = 'on route') AS on_route_count,
        (SELECT COUNT(*) FROM deliveries d WHERE d.status = 'delivered') AS delivered_count
    `;
    const [rows] = await runQuery(sql, [...dateFilter.params, ...dateFilter.params]);
    return res.json(rows[0] || rows);
  } catch (err) {
    console.error('ADMIN METRICS OVERVIEW GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting overview metrics', error: err.message });
  }
});

// orders by status within date range
router.get('/metrics/orders_by_status', async (req, res) => {
  try {
    // Use deliveries table; preparing is counted globally (no date filter), others are for TODAY
    const sql = `
      SELECT 
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'pending%' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN d.status LIKE 'preparing%' THEN 1 ELSE 0 END) AS preparing,
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'on route%' THEN 1 ELSE 0 END) AS out_for_delivery,
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'delivered%' THEN 1 ELSE 0 END) AS complete,
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'cancelled%' THEN 1 ELSE 0 END) AS cancelled
      FROM deliveries d
    `;
    const [rows] = await runQuery(sql);
    try { console.log('orders_by_status (today via deliveries)', rows?.[0] || rows); } catch (_) {}
    return res.json(rows[0] || rows);
  } catch (err) {
    console.error('ADMIN METRICS ORDERS BY STATUS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting orders by status', error: err.message });
  }
});

// Health endpoint that logs and returns the same counts
router.get('/metrics/orders_by_status/health', async (req, res) => {
  try {
    const sql = `
      SELECT 
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'pending%' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN d.status LIKE 'preparing%' THEN 1 ELSE 0 END) AS preparing,
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'on route%' THEN 1 ELSE 0 END) AS out_for_delivery,
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'delivered%' THEN 1 ELSE 0 END) AS complete,
        SUM(CASE WHEN DATE(d.delivery_date) = CURRENT_DATE() AND d.status LIKE 'cancelled%' THEN 1 ELSE 0 END) AS cancelled
      FROM deliveries d
    `;
    const [rows] = await runQuery(sql);
    const payload = rows?.[0] || rows;
    console.log('orders_by_status/health', payload);
    return res.json({ ok: true, metrics: payload });
  } catch (err) {
    console.error('ADMIN METRICS ORDERS BY STATUS HEALTH ERROR:', err);
    return res.status(500).json({ ok: false, message: 'Error in orders_by_status health', error: err.message });
  }
});

// revenue by day for charting
router.get('/metrics/revenue_daily', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = buildDateRangeFilter(from, to, 'set_delivery_time');
    const sql = `
      SELECT DATE(set_delivery_time) AS day, IFNULL(SUM(total), 0) AS revenue
      FROM orders
      WHERE ${dateFilter.clause}
      GROUP BY day
      ORDER BY day
    `;
    const [rows] = await runQuery(sql, dateFilter.params);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN METRICS REVENUE DAILY GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting revenue daily', error: err.message });
  }
});

// Aggregate dashboard stats for admin home
router.get('/stats', async (req, res) => {
  try {
    const [usersCountRows] = await runQuery('SELECT COUNT(*) AS total_users FROM users');

    // Active users: prefer explicit status='active'; fall back to last_seen freshness window
    let activeUsers = 0;
    try {
      const [activeByStatus] = await runQuery(`SELECT COUNT(*) AS active_users FROM users WHERE status = 'active'`);
      activeUsers = activeByStatus?.[0]?.active_users || 0;
    } catch (e) {
      // Fallback: users seen in the last 2 minutes considered active
      try {
        const [activeByLastSeen] = await runQuery(`SELECT COUNT(*) AS active_users FROM users WHERE last_seen IS NOT NULL AND last_seen >= (NOW() - INTERVAL 2 MINUTE)`);
        activeUsers = activeByLastSeen?.[0]?.active_users || 0;
      } catch (_) {
        activeUsers = 0;
      }
    }

    // Total recipes
    let totalRecipes = 0;
    try {
      const [recipeCountRows] = await runQuery(`SELECT COUNT(*) AS total_recipes FROM recipes`);
      totalRecipes = recipeCountRows?.[0]?.total_recipes || 0;
    } catch (e) {
      totalRecipes = 0;
    }

    // New users this month (based on account_creation_time)
    let newUsersThisMonth = 0;
    try {
      const [rows] = await runQuery(`
        SELECT COUNT(*) AS cnt
        FROM users
        WHERE MONTH(account_creation_time) = MONTH(CURRENT_DATE())
          AND YEAR(account_creation_time) = YEAR(CURRENT_DATE())
      `);
      newUsersThisMonth = rows?.[0]?.cnt || 0;
    } catch (_) {
      newUsersThisMonth = 0;
    }

    // New recipes this month (based on recipes.created_at). If column missing, falls back to 0
    let newRecipesThisMonth = 0;
    try {
      const [rows] = await runQuery(`
        SELECT COUNT(*) AS cnt
        FROM recipes
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
          AND YEAR(created_at) = YEAR(CURRENT_DATE())
      `);
      newRecipesThisMonth = rows?.[0]?.cnt || 0;
    } catch (_) {
      newRecipesThisMonth = 0;
    }

    const [byTypeRows] = await runQuery(`
      SELECT user_type, COUNT(*) AS cnt
      FROM users
      GROUP BY user_type
    `);
    const usersByType = { customer: 0, admin: 0, courier: 0 };
    (byTypeRows || []).forEach(r => {
      if (r.user_type && usersByType.hasOwnProperty(r.user_type)) {
        usersByType[r.user_type] = Number(r.cnt) || 0;
      }
    });

    let ordersToday = 0;
    try {
      const [ordersTodayRows] = await runQuery(`
        SELECT COUNT(*) AS orders_today
        FROM orders
        WHERE DATE(set_delivery_time) = CURRENT_DATE()
      `);
      ordersToday = ordersTodayRows?.[0]?.orders_today || 0;
    } catch (_) {
      ordersToday = 0;
    }

    return res.json({
      total_users: usersCountRows?.[0]?.total_users || 0,
      active_users: activeUsers,
      users_by_type: usersByType,
      orders_today: ordersToday,
      total_recipes: totalRecipes,
      new_users_this_month: newUsersThisMonth,
      new_recipes_this_month: newRecipesThisMonth,
    });
  } catch (err) {
    console.error('ADMIN STATS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting admin stats', error: err.message });
  }
});

module.exports = router;
