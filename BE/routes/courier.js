// Courier routes (assigned deliveries, status updates)
const express = require('express');
const db = require('../dbSingleton');
const router = express.Router();

// helper: wrapped query that returns [rows]
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

// GET /api/courier/by-user/:userId
// Resolve courier row by linked users.user_id
router.get('/by-user/:userId', async (req, res) => {
  try {
    const [rows] = await runQuery(
      'SELECT courier_id, user_id, name, phone, status, deliveries_assigned FROM couriers WHERE user_id = ? LIMIT 1',
      [req.params.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('COURIER BY-USER GET ERROR:', err);
    return res.status(500).json({ message: 'Error resolving courier by user', error: err.message });
  }
});


// PATCH /api/courier/orders/:id/status
// Update order status (courier action)
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const status = req.body.status;
    const orderId = req.params.id;
    const [rows] = await runQuery('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);

    // Best-effort: notify the customer about the status change
    try {
      if (conn && typeof conn.promise === 'function') {
        const cx = conn.promise();
        const [[o]] = await cx.query('SELECT cust_id FROM orders WHERE order_id = ? LIMIT 1', [orderId]);
        const custId = o && o.cust_id;
        if (custId) {
          const [[u]] = await cx.query('SELECT u.user_id FROM customers c JOIN users u ON u.user_id = c.user_id WHERE c.cust_id = ? LIMIT 1', [custId]);
          const userId = u && u.user_id;
          if (userId) {
            const title = `סטטוס הזמנה #${orderId} עודכן ל-${status}`;
            const description = `השליח עדכן את מצב ההזמנה ל-${status}`;
            await cx.query(
              'INSERT IGNORE INTO notifications (user_id, type, related_id, title, description) VALUES (?, "order", ?, ?, ?)',
              [userId, orderId, title, description]
            );
          }
        }
      }
    } catch (_) { /* ignore notification errors */ }

    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating order status', error: err.message });
  }
});

// PATCH /api/courier/couriers/:id/name
// Update courier's name
router.patch('/couriers/:id/name', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET name = ? WHERE courier_id = ?', [req.body.name, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS NAME PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier name', error: err.message });
  }
});

// PATCH /api/courier/couriers/:id/phone
// Update courier's phone
router.patch('/couriers/:id/phone', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET phone = ? WHERE courier_id = ?', [req.body.phone, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS PHONE PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier phone', error: err.message });
  }
});

// GET /api/courier/couriers/:id/assigned_deliveries
// List all deliveries assigned to the courier
router.get('/couriers/:id/assigned_deliveries', async (req, res) => {
  try {
    const [rows] = await runQuery(`
      SELECT 
        d.delivery_id,
        CONCAT('#', o.order_id, '1000') AS order_number,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        a.street,
        a.city,
        o.set_delivery_time AS delivery_time
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN customers c ON o.cust_id = c.cust_id
      LEFT JOIN address a ON c.address_id = a.address_id
      WHERE d.courier_id = ?
      ORDER BY o.set_delivery_time ASC;
    `, [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS ASSIGNED DELIVERIES GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting courier assigned deliveries', error: err.message });
  }
});

// GET /api/courier/couriers/:id
// Get courier profile by id
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

// PATCH /api/courier/couriers/:id/status
// Set courier status (active, offline, on route) and update is_active accordingly
router.patch('/couriers/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    // Set is_active to 1 if status is 'active' or 'on route', otherwise 0
    const isActive = (status === 'active' || status === 'on route') ? 1 : 0;
    const [rows] = await runQuery(
      'UPDATE couriers SET status = ?, is_active = ? WHERE courier_id = ?', 
      [status, isActive, req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('COURIER STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier status', error: err.message });
  }
});

// GET /api/courier/couriers/:id/deliveries
// List courier deliveries (optional ?status=)
router.get('/couriers/:id/deliveries', async (req, res) => {
  try {
    const params = [req.params.id];
    let sql = `
      SELECT 
        d.delivery_id,
        d.status AS delivery_status,
        CONCAT('#', o.order_id, '1000') AS order_number,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        a.street,
        a.city,
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

// GET /api/courier/deliveries/:deliveryId
// Get a delivery (optionally enforce courier via ?courier_id=)
router.get('/deliveries/:deliveryId', async (req, res) => {
  const { deliveryId } = req.params;
  const { courier_id } = req.query; // ideally derive from session
  try {
    const [rows] = await runQuery(`
      SELECT d.delivery_id, d.status AS delivery_status, o.order_id,
             CONCAT('#', o.order_id, '1000') AS order_number,
             c.name AS customer_name, c.phone_number AS customer_phone,
             a.street, a.city, o.set_delivery_time
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

// PATCH /api/courier/deliveries/:id/status
// Update delivery status; cascade to orders/couriers (transactional when possible)
router.patch('/deliveries/:id/status', async (req, res) => {
  const { status, courier_id } = req.body; // courier_id should correspond to the authenticated courier
  const deliveryId = req.params.id;
  try {
    if (!conn || typeof conn.promise !== 'function') {
      // Fallback without explicit transaction
      await runQuery('UPDATE deliveries SET status = ? WHERE delivery_id = ? AND courier_id = ?', [status, deliveryId, courier_id]);
      if (status === 'delivered') {
        await runQuery(`UPDATE orders o JOIN deliveries d ON d.order_id = o.order_id SET o.order_status = 'complete' WHERE d.delivery_id = ?`, [deliveryId]);
        await runQuery(`
          UPDATE couriers c
          JOIN deliveries d ON d.courier_id = c.courier_id
          SET c.deliveries_assigned = GREATEST(c.deliveries_assigned - 1, 0),
              c.status = CASE WHEN (c.deliveries_assigned - 1) > 0 THEN 'on route' ELSE 'active' END
          WHERE d.delivery_id = ? AND d.courier_id = ?
        `, [deliveryId, courier_id]);
      }
      // Notify customer about delivery status change (best-effort)
      try {
        if (status) {
          const [[row]] = await (conn && conn.promise ? conn.promise() : { query: async () => [[]] }).query(
            'SELECT d.order_id, o.cust_id FROM deliveries d JOIN orders o ON o.order_id = d.order_id WHERE d.delivery_id = ? LIMIT 1',
            [deliveryId]
          );
          const ordId = row && row.order_id;
          const custId = row && row.cust_id;
          if (ordId && custId && conn && conn.promise) {
            const [[u]] = await conn.promise().query('SELECT u.user_id FROM customers c JOIN users u ON u.user_id = c.user_id WHERE c.cust_id = ? LIMIT 1', [custId]);
            const userId = u && u.user_id;
            if (userId) {
              const title = `סטטוס הזמנה #${ordId} עודכן ל-${status}`;
              const description = `מצב המשלוח עודכן ל-${status}`;
              await conn.promise().query(
                'INSERT IGNORE INTO notifications (user_id, type, related_id, title, description) VALUES (?, "order", ?, ?, ?)',
                [userId, ordId, title, description]
              );
            }
          }
        }
      } catch (_) { /* ignore */ }
      return res.json({ ok: true });
    }

    const cx = conn.promise();
    await cx.beginTransaction();

    await cx.query('UPDATE deliveries SET status = ? WHERE delivery_id = ? AND courier_id = ?', [status, deliveryId, courier_id]);

    if (status === 'delivered') {
      await cx.query(`UPDATE orders o JOIN deliveries d ON d.order_id = o.order_id SET o.order_status = 'complete' WHERE d.delivery_id = ?`, [deliveryId]);
      await cx.query(`
        UPDATE couriers c
        JOIN deliveries d ON d.courier_id = c.courier_id
        SET c.deliveries_assigned = GREATEST(c.deliveries_assigned - 1, 0),
            c.status = CASE WHEN (c.deliveries_assigned - 1) > 0 THEN 'on route' ELSE 'active' END
        WHERE d.delivery_id = ? AND d.courier_id = ?
      `, [deliveryId, courier_id]);
    }

    await cx.commit();
    // Notify customer about delivery status change (best-effort)
    try {
      if (status) {
        const [[row2]] = await cx.query(
          'SELECT d.order_id, o.cust_id FROM deliveries d JOIN orders o ON o.order_id = d.order_id WHERE d.delivery_id = ? LIMIT 1',
          [deliveryId]
        );
        const ordId2 = row2 && row2.order_id;
        const custId2 = row2 && row2.cust_id;
        if (ordId2 && custId2) {
          const [[u2]] = await cx.query('SELECT u.user_id FROM customers c JOIN users u ON u.user_id = c.user_id WHERE c.cust_id = ? LIMIT 1', [custId2]);
          const userId2 = u2 && u2.user_id;
          if (userId2) {
            const title2 = `סטטוס הזמנה #${ordId2} עודכן ל-${status}`;
            const description2 = `מצב המשלוח עודכן ל-${status}`;
            await cx.query(
              'INSERT IGNORE INTO notifications (user_id, type, related_id, title, description) VALUES (?, "order", ?, ?, ?)',
              [userId2, ordId2, title2, description2]
            );
          }
        }
      }
    } catch (_) { /* ignore */ }
    return res.json({ ok: true });
  } catch (err) {
    try { if (conn && typeof conn.promise === 'function') await conn.promise().rollback(); } catch (_) {}
    console.error('COURIER DELIVERY STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating delivery status', error: err.message });
  }
});

// POST /api/courier/deliveries/:id/accept
// Accept/assign a delivery to this courier (subject to rules)
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
        AND c.is_active = 1
        AND c.status IN ('active','on route')
        AND c.deliveries_assigned < 10;
    `, [courier_id, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('COURIER DELIVERY ACCEPT ERROR:', err);
    return res.status(500).json({ message: 'Error accepting delivery', error: err.message });
  }
});

// POST /api/courier/deliveries/:id/decline
// Decline/unassign a delivery
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

// GET /api/courier/couriers/:id/stats
// Basic stats for courier dashboard
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
