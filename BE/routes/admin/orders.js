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


//manage couriers


//get all  couriers
router.get('/couriers', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM couriers');
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS LIST ERROR:', err);
    return res.status(500).json({ message: 'Error listing couriers', error: err.message });
  }
});

//get a specific courier
router.get('/couriers/:id', async (req, res) => {
    try {
      const [rows] = await runQuery('SELECT * FROM couriers WHERE courier_id = ?', [req.params.id]);
      return res.json(rows);
    } catch (err) {
      console.error('ADMIN COURIERS GET ERROR:', err);
      return res.status(500).json({ message: 'Error getting courier', error: err.message });
    }
  });


//delete a specific courier
router.delete('/couriers/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid courier id' });

  // Use a transaction: update users then delete courier
  try {
    if (!conn || typeof conn.promise !== 'function') throw new Error('DB connection not initialized');
    const cx = conn.promise();
    await cx.beginTransaction();
    try {
      // Update the linked user to customer. This handles both schemas:
      // - If couriers has user_id, update that user
      // - Also attempt updating when users.user_id == courier_id (if that's your model)
      await cx.query(
        `UPDATE users 
         SET user_type = 'customer'
         WHERE user_id IN (
           SELECT user_id FROM couriers WHERE courier_id = ?
         ) OR user_id = ?`,
        [id, id]
      );

      const [delRes] = await cx.query(`DELETE FROM couriers WHERE courier_id = ?`, [id]);
      await cx.commit();

      return res.json({
        message: 'Courier deleted and user reverted to customer (if applicable)',
        deleted: delRes.affectedRows || 0
      });
    } catch (txErr) {
      await cx.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('ADMIN COURIERS DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting courier', error: err.message });
  }
});

//add a courier to the table
router.post('/couriers', async (req, res) => {
  try {
    const userId = Number(req.body?.user_id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: 'user_id is required and must be a number' });
    }

    // Insert only user_id and name, deriving name from users.username
    const sql = `
      INSERT INTO couriers (user_id, name)
      SELECT u.user_id, u.username
      FROM users u
      WHERE u.user_id = ?
        AND u.user_type = 'courier'
        AND NOT EXISTS (
          SELECT 1 FROM couriers c WHERE c.user_id = u.user_id
        )
    `;
    const [result] = await runQuery(sql, [userId]);

    // When NOTHING inserted, determine reason for a helpful message
    if (!result || !result.affectedRows) {
      const [uRows] = await runQuery('SELECT user_id, user_type FROM users WHERE user_id = ?', [userId]);
      const user = Array.isArray(uRows) ? uRows[0] : undefined;
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.user_type !== 'courier') return res.status(400).json({ message: 'User is not a courier' });
      // If courier already exists
      const [cRows] = await runQuery('SELECT 1 FROM couriers WHERE user_id = ? LIMIT 1', [userId]);
      if (Array.isArray(cRows) && cRows.length > 0) return res.status(400).json({ message: 'Courier already exists' });
      // Fallback
      return res.status(400).json({ message: 'Unable to add courier' });
    }

    return res.status(201).json({ message: 'Courier added', insertedId: result.insertId });
  } catch (err) {
    console.error('ADMIN COURIERS POST ERROR:', err);
    return res.status(500).json({ message: 'Error adding courier', error: err.message });
  }
});

//update courier info
router.patch('/couriers/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET ? WHERE courier_id = ?', [req.body, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier', error: err.message });
  }
});

//get courier status
router.get('/couriers/:id/status', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT status FROM couriers WHERE courier_id = ?', [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS STATUS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting courier status', error: err.message });
  }
});

//update status of a specific courier
router.patch('/couriers/:id/status', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET status = ? WHERE courier_id = ?', [req.body.status, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier status', error: err.message });
  }
});

//set assigned_deliveries to 0 if courier is deleted or offline
router.patch('/couriers/:id/assigned_deliveries', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE couriers SET deliveries_assigned = 0 WHERE courier_id = ? AND status = "offline"', [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN COURIERS ASSIGNED DELIVERIES PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating courier assigned deliveries', error: err.message });
  }
});


//manage deliveries

//get all deliveries
router.get('/deliveries', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM deliveries');
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN DELIVERIES GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting deliveries', error: err.message });
  }
});

//get a specific delivery
router.get('/deliveries/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM deliveries WHERE delivery_id = ?', [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN DELIVERIES GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting delivery', error: err.message });
  }
});

//update delivery info
router.patch('/deliveries/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE deliveries SET ? WHERE delivery_id = ?', [req.body, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN DELIVERIES PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating delivery', error: err.message });
  }
});

//delete delivery
router.delete('/deliveries/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('DELETE FROM deliveries WHERE delivery_id = ?', [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN DELIVERIES DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting delivery', error: err.message });
  }
});

// update courier associated to delivery where courier is active and his assigned deliveries are less than 10
router.patch('/deliveries/:id/courier', async (req, res) => {
  try {
    const [rows] = await runQuery(`
      UPDATE deliveries d
      JOIN couriers c ON c.courier_id = ?
      SET d.courier_id = c.courier_id,
          c.deliveries_assigned = c.deliveries_assigned + 1,
          c.status = 'on route'
      WHERE d.delivery_id = ?
        AND c.status = 'active' 
        AND c.deliveries_assigned < 10;
      `,
      [req.body.courier_id, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN DELIVERIES PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating delivery', error: err.message });
  }
});

//update status of a specific delivery
router.patch('/deliveries/:id/status', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE deliveries SET status = ? WHERE delivery_id = ?', [req.body.status, req.params.id]);
    if (req.body.status === 'delivered') {
      await runQuery(`UPDATE orders SET status = 'complete' WHERE order_id = ?`, [req.params.id]);
    }
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN DELIVERIES STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating delivery status', error: err.message });
  }
});


//manage orders

//get all orders
router.get('/orders', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM orders');
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting orders', error: err.message });
  }
});

//get a specific order
router.get('/orders/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS GET ERROR:', err);
    return res.status(500).json({ message: 'Error getting order', error: err.message });
  }
});

// GET /api/admin/orders/:id/items - include product/recipe details for admin view
router.get('/orders/:id/items', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid order id' });
    const [items] = await runQuery(`
      SELECT 
        oi.order_item_id AS id,
        oi.order_id,
        oi.product_id,
        oi.quantity,
        p.price AS unit_price,
        (p.price * oi.quantity) AS line_total,
        r.name AS recipe_name,
        r.picture,
        r.calories,
        r.category_id
      FROM order_items oi
      INNER JOIN products p ON p.product_id = oi.product_id
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id ASC
    `, [id]);
    return res.json({ items });
  } catch (err) {
    console.error('ADMIN ORDER ITEMS ERROR:', err);
    return res.status(500).json({ message: 'Error getting order items', error: err.message });
  }
});

//update order info
router.patch('/orders/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE orders SET ? WHERE order_id = ?', [req.body, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating order', error: err.message });
  }
});

//delete order
router.delete('/orders/:id', async (req, res) => {
  try {
    const [rows] = await runQuery('DELETE FROM orders WHERE order_id = ?', [req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting order', error: err.message });
  }
});

//update status of a specific order
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const [rows] = await runQuery('UPDATE orders SET status = ? WHERE order_id = ?', [req.body.status, req.params.id]);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN ORDERS STATUS PATCH ERROR:', err);
    return res.status(500).json({ message: 'Error updating order status', error: err.message });
  }
});

module.exports = router;





