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

const TAX_RATE_PERCENT = Number(process.env.TAX_RATE_PERCENT ?? 18.0);

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
        unit_price_net DECIMAL(10,2) NULL,
        tax_rate DECIMAL(5,2) NULL,
        tax_amount DECIMAL(10,2) NULL,
        unit_price_gross DECIMAL(10,2) NULL,
        category_id INT NULL,
        delivery_at DATETIME NULL,
        CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
      )
    `);
    // Add missing tax columns if table already existed
    const cols = await query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'");
    const have = new Set(cols.map(c => c.COLUMN_NAME));
    if (!have.has('unit_price_net')) await query("ALTER TABLE order_items ADD COLUMN unit_price_net DECIMAL(10,2) NULL AFTER price");
    if (!have.has('tax_rate')) await query("ALTER TABLE order_items ADD COLUMN tax_rate DECIMAL(5,2) NULL AFTER unit_price_net");
    if (!have.has('tax_amount')) await query("ALTER TABLE order_items ADD COLUMN tax_amount DECIMAL(10,2) NULL AFTER tax_rate");
    if (!have.has('unit_price_gross')) await query("ALTER TABLE order_items ADD COLUMN unit_price_gross DECIMAL(10,2) NULL AFTER tax_amount");
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
      SELECT ci.id, ci.product_id, ci.quantity, ci.price, ci.unit_price_net, ci.tax_rate, ci.tax_amount, ci.unit_price_gross, r.recipe_id, r.calories, r.category_id
      FROM cart_items ci
      INNER JOIN products p ON p.product_id = ci.product_id
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE ci.user_id = ?
    `, [uid]).then(([rows]) => rows);

    if (!cart || cart.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const totalPrice = cart.reduce((s,it)=> s + Number((it.unit_price_gross ?? it.price) || 0) * Number(it.quantity||0), 0);
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
      // Snapshot tax fields into order_items; fallback compute if cart row doesn't have them
      const unitNet = (typeof it.unit_price_net !== 'undefined' && it.unit_price_net !== null) ? Number(it.unit_price_net) : Number(it.price);
      const taxRate = (typeof it.tax_rate !== 'undefined' && it.tax_rate !== null) ? Number(it.tax_rate) : TAX_RATE_PERCENT;
      const taxAmount = (typeof it.tax_amount !== 'undefined' && it.tax_amount !== null) ? Number(it.tax_amount) : Number(((unitNet * taxRate) / 100).toFixed(2));
      const unitGross = (typeof it.unit_price_gross !== 'undefined' && it.unit_price_gross !== null) ? Number(it.unit_price_gross) : Number((unitNet + taxAmount).toFixed(2));

      await tx.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, unit_price_net, tax_rate, tax_amount, unit_price_gross, category_id, delivery_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, it.product_id, it.quantity, unitGross, unitNet, taxRate, taxAmount, unitGross, it.category_id ?? null, deliveryAt]
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
