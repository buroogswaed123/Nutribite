//all routes user_type courier could use
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


//update status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE orders SET status = ? WHERE order_id = ?', [req.body.status, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating order status', error: err.message });
  }
});

//Update name
router.patch('/couriers/:id/name', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET name = ? WHERE courier_id = ?', [req.body.name, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS NAME PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier name', error: err.message });
  }
});

//Update phone
router.patch('/couriers/:id/phone', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET phone = ? WHERE courier_id = ?', [req.body.phone, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS PHONE PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier phone', error: err.message });
  }
});

//view all assigned deliveries
router.get('/couriers/:id/assigned_deliveries', async (req, res) => {
  try {
    const [rows] = await runQuery(`
      SELECT 
        d.delivery_id,
        CONCAT('#', o.order_id, '1000') AS order_number,
        c.name AS customer_name,
        c.phone AS customer_phone,
        a.street,
        a.city,
        a.zip,
        o.set_delivery_time AS delivery_time
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN customers c ON o.cust_id = c.cust_id
      JOIN address a ON c.address_id = a.address_id
      WHERE d.courier_id = ?
      ORDER BY o.set_delivery_time ASC;
    `, [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS ASSIGNED DELIVERIES GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting courier assigned deliveries', error: err.message });
  }
});

module.exports = router;
