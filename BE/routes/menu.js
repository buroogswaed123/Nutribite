// Public menu routes (read-only)
// Base: /api/menu

const express = require('express');
const db = require('../dbSingleton');
const router = express.Router();

// DB helper returning rows[] consistently
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

// GET /api/menu
// List all products where linked recipe is not soft-deleted
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.*
      FROM products p
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE r.deleted_at IS NULL
      ORDER BY p.product_id DESC
    `;
    const rows = await query(sql);
    return res.json(rows);
  } catch (err) {
    console.error('PUBLIC MENU LIST ERROR:', err);
    return res.status(500).json({ message: 'Error listing products', error: err.message });
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

  try {
    const baseSelect = `
      SELECT 
        *
      FROM products 
      WHERE product_id = ?
    `;
    const rows = await query(baseSelect, [productId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('PUBLIC MENU GET ERROR:', err);
    return res.status(500).json({ message: 'Error fetching product', error: err.message });
  }
});

// GET /api/menu/search
// Query params (all optional):
//   q (substring match on recipe name), minPrice, maxPrice, minCalories, maxCalories, dietType, category
//   limit (default 20, max 100), offset (default 0)
router.get('/search', async (req, res) => {
  try {
    const qStr = (req.query.q || '').toString().trim();

    const minP = Number(req.query.minPrice);
    const maxP = Number(req.query.maxPrice);
    const minC = Number(req.query.minCalories);
    const maxC = Number(req.query.maxCalories);
    const dietType = req.query.dietType || '';
    const category = req.query.category || '';
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const where = [];
    const whereParams = [];

    // Exclude soft-deleted recipes
    where.push('r.deleted_at IS NULL');

    if (qStr) {
      where.push('r.name LIKE ?');
      whereParams.push(`%${qStr}%`);
    }
    // Price filter based on products.price
    if (Number.isFinite(minP) && Number.isFinite(maxP)) {
      where.push('p.price BETWEEN ? AND ?');
      whereParams.push(minP, maxP);
    } else if (Number.isFinite(minP)) {
      where.push('p.price >= ?');
      whereParams.push(minP);
    } else if (Number.isFinite(maxP)) {
      where.push('p.price <= ?');
      whereParams.push(maxP);
    }
    // Calories
    if (Number.isFinite(minC) && Number.isFinite(maxC)) {
      where.push('r.calories BETWEEN ? AND ?');
      whereParams.push(minC, maxC);
    } else if (Number.isFinite(minC)) {
      where.push('r.calories >= ?');
      whereParams.push(minC);
    } else if (Number.isFinite(maxC)) {
      where.push('r.calories <= ?');
      whereParams.push(maxC);
    }
    if (dietType) {
      where.push('r.diet_type_id = ?');
      whereParams.push(dietType);
    }
    if (category) {
      where.push('r.category_id = ?');
      whereParams.push(category);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      ${whereSql}
    `;
    const selectSql = `
      SELECT 
        p.*
      FROM products p
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      ${whereSql}
      ORDER BY p.product_id DESC
      LIMIT ? OFFSET ?
    `;

    const countRows = await query(countSql, [...whereParams]);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    const rows = await query(selectSql, [...whereParams, lim, off]);
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('PUBLIC MENU SEARCH ERROR:', err);
    return res.status(500).json({ message: 'Error searching products', error: err.message });
  }
});

module.exports = router;
