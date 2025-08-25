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

//get all users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM users');
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
    const { from, to } = req.query;
    const dateFilter = buildDateRangeFilter(from, to, 'o.set_delivery_time');
    const sql = `
      SELECT 
        SUM(o.status = 'pending') AS pending,
        SUM(o.status = 'preparing') AS preparing,
        SUM(o.status = 'out for delivery') AS out_for_delivery,
        SUM(o.status = 'complete') AS complete,
        SUM(o.status = 'cancelled') AS cancelled
      FROM orders o
      WHERE ${dateFilter.clause}
    `;
    const [rows] = await runQuery(sql, dateFilter.params);
    return res.json(rows[0] || rows);
  } catch (err) {
    console.error('ADMIN METRICS ORDERS BY STATUS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting orders by status', error: err.message });
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

module.exports = router;
