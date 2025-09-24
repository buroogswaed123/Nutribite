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

// Ensure orders and order_items tables exist if not present
(async () => {
  try {
    // Create orders table first (referenced by order_items)
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_calories INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL
      )
    `);

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

// GET /api/orders - list current user's orders (schema uses cust_id on orders)
router.get('/', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    // resolve cust_id from customers by user_id
    const custRows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.json({ items: [] });

    const rows = await query(`
      SELECT 
        o.order_id,
        o.order_status AS status,
        o.total_price,
        NULL AS total_calories,
        o.order_date AS created_at
      FROM orders o
      WHERE o.cust_id = ?
      ORDER BY o.order_id DESC
    `, [cust]);
    return res.json({ items: rows });
  } catch (err) {
    console.error('ORDERS LIST ERROR:', err);
    return res.status(500).json({ message: 'Failed to list orders', error: err.message });
  }
});

// GET /api/orders/draft/latest - latest draft order for current user
router.get('/draft/latest', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const custRows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.status(404).json({ message: 'Customer not found' });
    const rows = await query("SELECT order_id FROM orders WHERE cust_id = ? AND order_status = 'draft' ORDER BY order_id DESC LIMIT 1", [cust]);
    if (!rows || !rows[0]) return res.status(404).json({ message: 'No draft order' });
    return res.json({ order_id: rows[0].order_id });
  } catch (err) {
    console.error('LATEST DRAFT ERROR:', err);
    return res.status(500).json({ message: 'Failed to get draft order', error: err.message });
  }
});

// POST /api/orders/:id/confirm - mark order as confirmed (ownership enforced)
router.post('/:id/confirm', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    const custRows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.status(404).json({ message: 'Customer not found' });

    const own = await query('SELECT order_id FROM orders WHERE order_id = ? AND cust_id = ? LIMIT 1', [id, cust]);
    if (!own || !own[0]) return res.status(404).json({ message: 'Order not found' });

    await query("UPDATE orders SET order_status = 'confirmed' WHERE order_id = ? AND cust_id = ?", [id, cust]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('CONFIRM ORDER ERROR:', err);
    return res.status(500).json({ message: 'Failed to confirm order', error: err.message });
  }
});

// POST /api/orders/:id/rebuild_cart - rebuild current user's cart from a past order
router.post('/:id/rebuild_cart', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    // Resolve cust_id
    const custRows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.status(404).json({ message: 'Customer not found' });

    // Check ownership
    const ordRows = await query('SELECT order_id FROM orders WHERE order_id = ? AND cust_id = ? LIMIT 1', [id, cust]);
    if (!ordRows || !ordRows[0]) return res.status(404).json({ message: 'Order not found' });

    // Load items from order
    const items = await query('SELECT product_id, quantity FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC', [id]);
    if (!items || items.length === 0) return res.json({ rebuilt: 0 });

    // Clear current cart then insert
    await query('DELETE FROM cart_items WHERE user_id = ?', [uid]);
    for (const it of items) {
      // Use current product price as unit price in cart
      const prod = await query('SELECT price FROM products WHERE product_id = ? LIMIT 1', [it.product_id]);
      const price = prod && prod[0] ? Number(prod[0].price || 0) : 0;
      await query(
        'INSERT INTO cart_items (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [uid, it.product_id, it.quantity, price]
      );
    }
    return res.json({ rebuilt: items.length });
  } catch (err) {
    console.error('REBUILD CART ERROR:', err);
    return res.status(500).json({ message: 'Failed to rebuild cart', error: err.message });
  }
});

// GET /api/orders/:id - order details with items (validate by cust_id)
router.get('/:id', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    const custRows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.status(404).json({ message: 'Customer not found' });

    const orders = await query('SELECT * FROM orders WHERE order_id = ? AND cust_id = ? LIMIT 1', [id, cust]);
    const order = orders && orders[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const items = await query(`
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

    // Resolve customer's cust_id
    const custRows = await tx.query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]).then(([r]) => r);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.status(400).json({ message: 'Customer not found for user' });

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

    // Derive the selected delivery datetime for the order
    const normalizeToMySQL = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
    let selectedDate = null;
    if (allAt) {
      const d = new Date(allAt);
      if (!isNaN(d.getTime())) selectedDate = d;
    } else {
      // compute earliest valid datetime from schedule values
      const vals = Object.values(schedule || {});
      let min = null;
      for (const v of vals) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) {
          if (!min || d.getTime() < min.getTime()) min = d;
        }
      }
      if (min) selectedDate = min;
    }
    // Server-side validation: if client supplied a datetime, enforce [today, today+7], and 06:00–23:59
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (selectedDate) {
      const hh = selectedDate.getHours();
      if (hh < 6 || hh > 23) {
        return res.status(400).json({ message: 'Invalid delivery time (06:00–23:59 only)' });
      }
      const sdDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      if (sdDay.getTime() < today.getTime()) {
        return res.status(400).json({ message: 'Delivery date cannot be in the past' });
      }
      if (sdDay.getTime() > weekAhead.getTime()) {
        return res.status(400).json({ message: 'Delivery date cannot be more than 7 days ahead' });
      }
      if (sdDay.getTime() === today.getTime() && selectedDate.getTime() < now.getTime()) {
        return res.status(400).json({ message: 'Delivery time cannot be in the past' });
      }
    }
    const orderDateValue = selectedDate ? normalizeToMySQL(selectedDate) : null;
    const orderSetTime = selectedDate ? normalizeToMySQL(selectedDate) : null;

    // Create order in existing schema
    let insOrder;
    if (orderDateValue) {
      [insOrder] = await tx.query(
        `INSERT INTO orders (order_date, order_status, total_price, cust_id, set_delivery_time) VALUES (?, 'draft', ?, ?, ?)`,
        [orderDateValue, totalPrice, cust, orderSetTime]
      );
    } else {
      [insOrder] = await tx.query(
        `INSERT INTO orders (order_date, order_status, total_price, cust_id, set_delivery_time) VALUES (NOW(), 'draft', ?, ?, NULL)`,
        [totalPrice, cust]
      );
    }
    const orderId = insOrder.insertId;

    // Insert items into order_items (minimal schema)
    for (const it of cart) {
      // Given minimal schema, we only store order_id, product_id, quantity
      await tx.query(
        `INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`,
        [orderId, it.product_id, it.quantity]
      );
    }

    // Clear cart (we keep a rebuild endpoint to recover if needed)
    await tx.query(`DELETE FROM cart_items WHERE user_id = ?`, [uid]);

    return res.status(201).json({ order_id: orderId });
  } catch (err) {
    console.error('CHECKOUT ERROR:', err);
    return res.status(500).json({ message: 'Failed to checkout', error: err.message });
  }
});

module.exports = router;
 
// POST /api/orders/:id/rebuild_cart - rebuild current user's cart from a past order
router.post('/:id/rebuild_cart', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    // Resolve cust_id
    const custRows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [uid]);
    const cust = custRows && custRows[0] ? custRows[0].cust_id : null;
    if (!cust) return res.status(404).json({ message: 'Customer not found' });

    // Check ownership
    const ordRows = await query('SELECT order_id FROM orders WHERE order_id = ? AND cust_id = ? LIMIT 1', [id, cust]);
    if (!ordRows || !ordRows[0]) return res.status(404).json({ message: 'Order not found' });

    // Load items from order
    const items = await query('SELECT product_id, quantity FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC', [id]);
    if (!items || items.length === 0) return res.json({ rebuilt: 0 });

    // Clear current cart then insert
    await query('DELETE FROM cart_items WHERE user_id = ?', [uid]);
    for (const it of items) {
      // Use current product price as unit price in cart
      const prod = await query('SELECT price FROM products WHERE product_id = ? LIMIT 1', [it.product_id]);
      const price = prod && prod[0] ? Number(prod[0].price || 0) : 0;
      await query(
        'INSERT INTO cart_items (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [uid, it.product_id, it.quantity, price]
      );
    }
    return res.json({ rebuilt: items.length });
  } catch (err) {
    console.error('REBUILD CART ERROR:', err);
    return res.status(500).json({ message: 'Failed to rebuild cart', error: err.message });
  }
});
