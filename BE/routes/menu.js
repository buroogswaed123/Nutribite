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

// GET /api/menu/by-recipe/:recipeId
// Returns the product row joined with recipe info for a given recipe_id
router.get('/by-recipe/:recipeId(\\d+)', async (req, res) => {
  try {
    const recipeId = Number(req.params.recipeId);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ message: 'Invalid recipe id' });
    const sql = `
      SELECT 
        p.product_id,
        p.recipe_id,
        p.price,
        p.stock,
        r.name,
        r.picture,
        r.calories,
        r.diet_type_id,
        r.category_id
      FROM products p
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE p.recipe_id = ? AND r.deleted_at IS NULL
      ORDER BY p.product_id DESC
      LIMIT 1
    `;
    const rows = await query(sql, [recipeId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Product not found for recipe' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('PUBLIC MENU BY-RECIPE ERROR:', err);
    return res.status(500).json({ message: 'Error fetching product', error: err.message });
  }
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
        p.product_id,
        p.recipe_id,
        p.price,
        p.stock,
        r.name,
        r.description,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fats_g,
        r.picture,
        r.rating AS rating_avg,
        r.diet_type_id,
        r.category_id,
        (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_name,
        (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category_name
      FROM products p
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE r.deleted_at IS NULL
      ORDER BY p.product_id DESC
    `;
    const rows = await query(sql);
    return res.json({ items: rows });
  } catch (err) {
    console.error('PUBLIC MENU LIST ERROR:', err);
    return res.status(500).json({ message: 'Error listing products', error: err.message });
  }
});

// GET /api/menu/:id (numeric only)
router.get('/:id(\\d+)', async (req, res) => {
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
        p.product_id,
        p.recipe_id,
        p.price,
        p.stock,
        r.name,
        r.description,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fats_g,
        r.picture,
        r.rating AS rating_avg,
        r.diet_type_id,
        r.category_id,
        (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_name,
        (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category_name
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

// Categories list with counts for Menu filters
// GET /api/menu/categories
router.get('/categories', async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.category_id AS id,
        c.name AS name,
        COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN recipes r ON r.category_id = c.category_id AND r.deleted_at IS NULL
      LEFT JOIN products p ON p.recipe_id = r.recipe_id
      GROUP BY c.category_id, c.name
      ORDER BY c.name ASC
    `;
    const rows = await query(sql);
    return res.json({ items: rows });
  } catch (err) {
    console.error('PUBLIC MENU CATEGORIES ERROR:', err);
    return res.status(500).json({ message: 'Error listing categories', error: err.message });
  }
});

// Additional endpoint: eligible products excluding customer's allergies
// GET /api/menu/eligible?customer_id=123
// Optional query: category, dietType, minCalories, maxCalories, minPrice, maxPrice
router.get('/eligible', async (req, res) => {
  try {
    let customerId = Number(req.query.customer_id);
    // Allow deriving customer_id from session user when not provided
    if (!Number.isFinite(customerId)) {
      const sessionUserId = req.session && req.session.user_id;
      if (Number.isFinite(Number(sessionUserId))) {
        const rows = await query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [Number(sessionUserId)]);
        if (rows && rows[0] && rows[0].cust_id) {
          customerId = Number(rows[0].cust_id);
        }
      }
      if (!Number.isFinite(customerId)) {
        return res.status(400).json({ message: 'customer_id is required' });
      }
    }

    const minP = Number(req.query.minPrice);
    const maxP = Number(req.query.maxPrice);
    const minC = Number(req.query.minCalories);
    const maxC = Number(req.query.maxCalories);
    const dietType = req.query.dietType || '';
    const category = req.query.category || '';

    const where = [];
    const params = [];
    // Exclude soft-deleted recipes
    where.push('r.deleted_at IS NULL');
    // Exclude products that contain any component the customer is allergic to
    where.push(`NOT EXISTS (
      SELECT 1
      FROM product_contains_components pcc
      JOIN customer_allergies ca ON ca.comp_id = pcc.comp_id
      WHERE pcc.product_id = p.product_id AND ca.customer_id = ?
    )`);
    params.push(customerId);

    // No heuristic text filters: rely strictly on component-based mapping in customer_allergies

    if (Number.isFinite(minP) && Number.isFinite(maxP)) { where.push('p.price BETWEEN ? AND ?'); params.push(minP, maxP); }
    else if (Number.isFinite(minP)) { where.push('p.price >= ?'); params.push(minP); }
    else if (Number.isFinite(maxP)) { where.push('p.price <= ?'); params.push(maxP); }

    if (Number.isFinite(minC) && Number.isFinite(maxC)) { where.push('r.calories BETWEEN ? AND ?'); params.push(minC, maxC); }
    else if (Number.isFinite(minC)) { where.push('r.calories >= ?'); params.push(minC); }
    else if (Number.isFinite(maxC)) { where.push('r.calories <= ?'); params.push(maxC); }

    if (dietType) { where.push('r.diet_type_id = ?'); params.push(dietType); }
    if (category) { where.push('r.category_id = ?'); params.push(category); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT 
        p.product_id,
        p.recipe_id,
        p.price,
        p.stock,
        r.name,
        r.description,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fats_g,
        r.picture,
        r.rating AS rating_avg,
        r.diet_type_id,
        r.category_id,
        (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_name,
        (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category_name
      FROM products p
      INNER JOIN recipes r ON r.recipe_id = p.recipe_id
      ${whereSql}
      ORDER BY p.product_id DESC
    `;

    const rows = await query(sql, params);
    return res.json({ items: rows });
  } catch (err) {
    console.error('PUBLIC MENU ELIGIBLE ERROR:', err);
    return res.status(500).json({ message: 'Error listing eligible products', error: err.message });
  }
});
