const express = require('express');
const router = express.Router();
const db = require('../dbSingleton');

const conn = db.getConnection && db.getConnection();
function query(sql, params = []) {
  if (!conn) throw new Error('DB connection not initialized');
  if (typeof conn.promise === 'function') {
    return conn.promise().query(sql, params).then(([rows]) => rows);
  }
  if (typeof conn.query === 'function') {
    return new Promise((resolve, reject) => {
      conn.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }
  throw new Error('Unsupported DB client');
}

function getUserId(req){ return req.session && req.session.user_id ? Number(req.session.user_id) : null; }

// Ensure order_items table exists if not present
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        category_id INT NULL,
        delivery_at DATETIME NULL,
        CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
      )
    `);
  } catch (e) { /* ignore */ }
})();

// GET /api/orders - list current user's orders
router.get('/', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const rows = await query(`
      SELECT o.order_id, o.status, o.total_price, o.total_calories, o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.order_id DESC
    `, [uid]);
    return res.json({ items: rows });
  } catch (err) {
    console.error('ORDERS LIST ERROR:', err);
    return res.status(500).json({ message: 'Failed to list orders', error: err.message });
  }
});

// GET /api/orders/:id - order details with items
router.get('/:id', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    const orders = await query('SELECT * FROM orders WHERE order_id = ? AND user_id = ? LIMIT 1', [id, uid]);
    const order = orders && orders[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const items = await query(`
      SELECT oi.*, r.name AS recipe_name, r.picture, r.calories, r.category_id
      FROM order_items oi
      INNER JOIN products p ON p.product_id = oi.product_id
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [id]);
    return res.json({ order, items });
  } catch (err) {
    console.error('ORDER GET ERROR:', err);
    return res.status(500).json({ message: 'Failed to get order', error: err.message });
  }
});

// POST /api/orders/checkout - create order from cart with per-category schedule
// Body: { schedule: { [categoryIdOrName]: ISOString or 'YYYY-MM-DDTHH:mm' }, applyToAll?: ISOString }
router.post('/checkout', async (req, res) => {
  const tx = conn.promise();
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });

    const schedule = req.body?.schedule || {}; // map category_id or names to datetime
    const allAt = req.body?.applyToAll || null;

    // Fetch cart items for the user joined to recipe for category & calories
    const cart = await tx.query(`
      SELECT ci.id, ci.product_id, ci.quantity, ci.price, r.recipe_id, r.calories, r.category_id
      FROM cart_items ci
      INNER JOIN products p ON p.product_id = ci.product_id
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE ci.user_id = ?
    `, [uid]).then(([rows]) => rows);

    if (!cart || cart.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const totalPrice = cart.reduce((s,it)=> s + Number(it.price||0)*Number(it.quantity||0), 0);
    const totalCalories = cart.reduce((s,it)=> s + Number(it.calories||0)*Number(it.quantity||0), 0);

    // Create order
    const [insOrder] = await tx.query(
      `INSERT INTO orders (user_id, status, total_price, total_calories, created_at) VALUES (?, 'pending', ?, ?, NOW())`,
      [uid, totalPrice, totalCalories]
    );
    const orderId = insOrder.insertId;

    // Insert items
    for (const it of cart) {
      let catKey = it.category_id != null ? String(it.category_id) : '';
      // allow mapping by name keys as well
      let deliveryAt = allAt || schedule[catKey] || schedule[String(catKey)] || null;
      if (deliveryAt) {
        // normalize to MySQL DATETIME
        const d = new Date(deliveryAt);
        if (!isNaN(d.getTime())) {
          deliveryAt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
        } else {
          deliveryAt = null;
        }
      }
      await tx.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, category_id, delivery_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, it.product_id, it.quantity, it.price, it.category_id ?? null, deliveryAt]
      );
    }

    // Clear cart
    await tx.query(`DELETE FROM cart_items WHERE user_id = ?`, [uid]);

    return res.status(201).json({ order_id: orderId });
  } catch (err) {
    console.error('CHECKOUT ERROR:', err);
    return res.status(500).json({ message: 'Failed to checkout', error: err.message });
  }
});

module.exports = router;
