const express = require('express');
const router = express.Router();
const db = require('../dbSingleton');

// helpers
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
  throw new Error('Unsupported DB client on connection');
}

function getUserId(req) {
  return req.session && req.session.user_id ? Number(req.session.user_id) : null;
}

// Tax rate (percent). Read from env; default 18%.
const TAX_RATE_PERCENT = Number(process.env.TAX_RATE_PERCENT ?? 18.0);

// GET /api/cart -> list cart items for current user (joined with product and recipe info)
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    const rows = await query(`
      SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.price, -- legacy gross unit price
        ci.unit_price_net,
        ci.tax_rate,
        ci.tax_amount,
        ci.unit_price_gross,
        p.recipe_id,
        p.stock,
        p.price AS current_price,
        r.name AS recipe_name,
        r.picture,
        COALESCE(r.calories, 0) AS calories,
        r.category_id,
        c.name AS category_name
      FROM cart_items ci
      INNER JOIN products p ON p.product_id = ci.product_id
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      LEFT JOIN categories c ON c.category_id = r.category_id
      WHERE ci.user_id = ?
      ORDER BY ci.id DESC
    `, [userId]);
    return res.json({ items: rows });
  } catch (err) {
    console.error('CART LIST ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch cart', error: err.message });
  }
});

// POST /api/cart -> add item { product_id, quantity }
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    const productId = Number(req.body?.product_id);
    const qty = Math.max(0, Number(req.body?.quantity ?? 1));
    if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ message: 'Invalid product_id' });
    if (!Number.isInteger(qty)) return res.status(400).json({ message: 'Quantity must be an integer' });

    // fetch product stock and price
    const prodRows = await query('SELECT product_id, price, stock FROM products WHERE product_id = ? LIMIT 1', [productId]);
    const prod = prodRows && prodRows[0];
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    const allowedQty = Math.min(qty, Math.max(0, Number(prod.stock) || 0));
    if (allowedQty <= 0) return res.status(400).json({ message: 'Out of stock' });

    // Compute tax based on product price as net for now
    const unitNet = Number(prod.price || 0);
    const taxRate = TAX_RATE_PERCENT;
    const taxAmount = Number(((unitNet * taxRate) / 100).toFixed(2));
    const unitGross = Number((unitNet + taxAmount).toFixed(2));

    // upsert: if exists, increment (capped by stock), else insert
    const existing = await query('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? LIMIT 1', [userId, productId]);
    if (existing && existing[0]) {
      const newQty = Math.min((Number(existing[0].quantity) || 0) + allowedQty, Math.max(0, Number(prod.stock) || 0));
      await query(
        'UPDATE cart_items SET quantity = ?, price = ?, unit_price_net = ?, tax_rate = ?, tax_amount = ?, unit_price_gross = ? WHERE id = ?',
        [newQty, unitGross, unitNet, taxRate, taxAmount, unitGross, existing[0].id]
      );
      return res.status(200).json({ ok: true, id: existing[0].id, quantity: newQty });
    }
    const ins = await query(
      'INSERT INTO cart_items (user_id, product_id, quantity, price, unit_price_net, tax_rate, tax_amount, unit_price_gross) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, productId, allowedQty, unitGross, unitNet, taxRate, taxAmount, unitGross]
    );
    return res.status(201).json({ ok: true, id: ins.insertId, quantity: allowedQty });
  } catch (err) {
    console.error('CART ADD ERROR:', err);
    return res.status(500).json({ message: 'Failed to add to cart', error: err.message });
  }
});

// PATCH /api/cart/:id -> update quantity
router.patch('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    const qty = Number(req.body?.quantity);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ message: 'Quantity must be integer >= 0' });

    const row = await query('SELECT product_id FROM cart_items WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
    if (!row || !row[0]) return res.status(404).json({ message: 'Cart item not found' });

    if (qty === 0) {
      await query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [id, userId]);
      return res.json({ ok: true, deleted: true });
    }

    const prodRows = await query('SELECT stock, price FROM products WHERE product_id = ? LIMIT 1', [row[0].product_id]);
    const prod = prodRows && prodRows[0];
    const cap = Math.max(0, Number(prod?.stock) || 0);
    const newQty = Math.min(qty, cap);
    const unitNet = Number(prod?.price || 0);
    const taxRate = TAX_RATE_PERCENT;
    const taxAmount = Number(((unitNet * taxRate) / 100).toFixed(2));
    const unitGross = Number((unitNet + taxAmount).toFixed(2));
    await query(
      'UPDATE cart_items SET quantity = ?, price = ?, unit_price_net = ?, tax_rate = ?, tax_amount = ?, unit_price_gross = ? WHERE id = ? AND user_id = ?',
      [newQty, unitGross, unitNet, taxRate, taxAmount, unitGross, id, userId]
    );
    return res.json({ ok: true, id, quantity: newQty });
  } catch (err) {
    console.error('CART UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Failed to update cart item', error: err.message });
  }
});

// DELETE /api/cart/:id -> remove one item
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    const id = Number(req.params.id);
    await query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('CART REMOVE ERROR:', err);
    return res.status(500).json({ message: 'Failed to remove cart item', error: err.message });
  }
});

// DELETE /api/cart -> clear cart
router.delete('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    await query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('CART CLEAR ERROR:', err);
    return res.status(500).json({ message: 'Failed to clear cart', error: err.message });
  }
});

// GET /api/cart/summary -> totals (price, calories)
router.get('/summary', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Not logged in' });
    const rows = await query(`
      SELECT 
        SUM(ci.quantity * COALESCE(ci.unit_price_gross, ci.price)) AS total_price,
        SUM(ci.quantity) AS total_items,
        SUM(ci.quantity * COALESCE(r.calories,0)) AS total_calories
      FROM cart_items ci
      INNER JOIN products p ON p.product_id = ci.product_id
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE ci.user_id = ?
    `, [userId]);
    const s = rows && rows[0] ? rows[0] : {};
    return res.json({
      total_price: Number(s.total_price || 0),
      total_items: Number(s.total_items || 0),
      total_calories: Number(s.total_calories || 0)
    });
  } catch (err) {
    console.error('CART SUMMARY ERROR:', err);
    return res.status(500).json({ message: 'Failed to get cart summary', error: err.message });
  }
});

module.exports = router;
