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

// get courier profile
router.get('/couriers/:id', async (req, res) => {
  try {
    const [rows] = await runQuery(
      'SELECT courier_id, name, phone, status, deliveries_assigned FROM couriers WHERE courier_id = ?',
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('COURIER PROFILE GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting courier profile', error: err.message });
  }
});

// set courier status (e.g., active, offline, on route)
router.patch('/couriers/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const [rows] = await runQuery('UPDATE couriers SET status = ? WHERE courier_id = ?', [status, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('COURIER STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier status', error: err.message });
  }
});

// list deliveries for a courier with optional status filter
router.get('/couriers/:id/deliveries', async (req, res) => {
  try {
    const params = [req.params.id];
    let sql = `
      SELECT 
        d.delivery_id,
        d.status AS delivery_status,
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
      LEFT JOIN address a ON c.address_id = a.address_id
      WHERE d.courier_id = ?`;
    if (req.query.status) {
      sql += ' AND d.status = ?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY o.set_delivery_time ASC';

    const [rows] = await runQuery(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('COURIER DELIVERIES LIST GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting deliveries', error: err.message });
  }
});

// get a specific delivery (ensuring it belongs to the courier via query param)
router.get('/deliveries/:deliveryId', async (req, res) => {
  const { deliveryId } = req.params;
  const { courier_id } = req.query; // ideally derive from session
  try {
    const [rows] = await runQuery(`
      SELECT d.delivery_id, d.status AS delivery_status, o.order_id,
             CONCAT('#', o.order_id, '1000') AS order_number,
             c.name AS customer_name, c.phone AS customer_phone,
             a.street, a.city, a.zip, o.set_delivery_time
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN customers c ON o.cust_id = c.cust_id
      LEFT JOIN address a ON c.address_id = a.address_id
      WHERE d.delivery_id = ?
      ${courier_id ? 'AND d.courier_id = ?' : ''}
    `, courier_id ? [deliveryId, courier_id] : [deliveryId]);
    return res.json(rows);
  } catch (err) {
    console.error('COURIER DELIVERY GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting delivery', error: err.message });
  }
});

// update delivery status with cascading updates (transactional when possible)
router.patch('/deliveries/:id/status', async (req, res) => {
  const { status, courier_id } = req.body; // courier_id should correspond to the authenticated courier
  const deliveryId = req.params.id;
  try {
    if (!conn || typeof conn.promise !== 'function') {
      // Fallback without explicit transaction
      await runQuery('UPDATE deliveries SET status = ? WHERE delivery_id = ? AND courier_id = ?', [status, deliveryId, courier_id]);
      if (status === 'delivered') {
        await runQuery(`UPDATE orders o JOIN deliveries d ON d.order_id = o.order_id SET o.status = 'complete' WHERE d.delivery_id = ?`, [deliveryId]);
        await runQuery(`
          UPDATE couriers c
          JOIN deliveries d ON d.courier_id = c.courier_id
          SET c.deliveries_assigned = GREATEST(c.deliveries_assigned - 1, 0),
              c.status = CASE WHEN (c.deliveries_assigned - 1) > 0 THEN 'on route' ELSE 'active' END
          WHERE d.delivery_id = ? AND d.courier_id = ?
        `, [deliveryId, courier_id]);
      }
      return res.json({ ok: true });
    }

    const cx = conn.promise();
    await cx.beginTransaction();

    await cx.query('UPDATE deliveries SET status = ? WHERE delivery_id = ? AND courier_id = ?', [status, deliveryId, courier_id]);

    if (status === 'delivered') {
      await cx.query(`UPDATE orders o JOIN deliveries d ON d.order_id = o.order_id SET o.status = 'complete' WHERE d.delivery_id = ?`, [deliveryId]);
      await cx.query(`
        UPDATE couriers c
        JOIN deliveries d ON d.courier_id = c.courier_id
        SET c.deliveries_assigned = GREATEST(c.deliveries_assigned - 1, 0),
            c.status = CASE WHEN (c.deliveries_assigned - 1) > 0 THEN 'on route' ELSE 'active' END
        WHERE d.delivery_id = ? AND d.courier_id = ?
      `, [deliveryId, courier_id]);
    }

    await cx.commit();
    return res.json({ ok: true });
  } catch (err) {
    try { if (conn && typeof conn.promise === 'function') await conn.promise().rollback(); } catch (_) {}
    console.error('COURIER DELIVERY STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating delivery status', error: err.message });
  }
});

// accept a delivery (assign to this courier if available)
router.post('/deliveries/:id/accept', async (req, res) => {
  const { courier_id } = req.body; // derive from session ideally
  try {
    const [rows] = await runQuery(`
      UPDATE deliveries d
      JOIN couriers c ON c.courier_id = ?
      SET d.courier_id = c.courier_id,
          d.status = 'on route',
          c.deliveries_assigned = c.deliveries_assigned + 1,
          c.status = 'on route'
      WHERE d.delivery_id = ?
        AND (d.courier_id IS NULL OR d.courier_id = c.courier_id)
        AND c.status IN ('active','on route')
        AND c.deliveries_assigned < 10;
    `, [courier_id, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('COURIER DELIVERY ACCEPT ERROR:', err);
    return res.status(500).json({ message: 'Error accepting delivery', error: err.message });
  }
});

// decline/unassign a delivery (if business rules allow)
router.post('/deliveries/:id/decline', async (req, res) => {
  const { courier_id } = req.body; // derive from session ideally
  const deliveryId = req.params.id;
  try {
    if (!conn || typeof conn.promise !== 'function') {
      await runQuery(`
        UPDATE couriers c
        JOIN deliveries d ON d.courier_id = c.courier_id
        SET c.deliveries_assigned = GREATEST(c.deliveries_assigned - 1, 0)
        WHERE d.delivery_id = ? AND d.courier_id = ?
      `, [deliveryId, courier_id]);
      const [rows] = await runQuery(`UPDATE deliveries SET courier_id = NULL, status = 'assigned' WHERE delivery_id = ? AND courier_id = ?`, [deliveryId, courier_id]);
      return res.json(rows);
    }
    const cx = conn.promise();
    await cx.beginTransaction();
    await cx.query(`
      UPDATE couriers c
      JOIN deliveries d ON d.courier_id = c.courier_id
      SET c.deliveries_assigned = GREATEST(c.deliveries_assigned - 1, 0)
      WHERE d.delivery_id = ? AND d.courier_id = ?
    `, [deliveryId, courier_id]);
    const [rows] = await cx.query(`UPDATE deliveries SET courier_id = NULL, status = 'assigned' WHERE delivery_id = ? AND courier_id = ?`, [deliveryId, courier_id]);
    await cx.commit();
    return res.json(rows);
  } catch (err) {
    try { if (conn && typeof conn.promise === 'function') await conn.promise().rollback(); } catch (_) {}
    console.error('COURIER DELIVERY DECLINE ERROR:', err);
    return res.status(500).json({ message: 'Error declining delivery', error: err.message });
  }
});

// basic stats for courier dashboard
router.get('/couriers/:id/stats', async (req, res) => {
  try {
    const [rows] = await runQuery(`
      SELECT 
        SUM(CASE WHEN d.status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN d.status = 'on route' THEN 1 ELSE 0 END) AS on_route,
        SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) AS delivered
      FROM deliveries d
      WHERE d.courier_id = ?
    `, [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('COURIER STATS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting courier stats', error: err.message });
  }
});

module.exports = router;
