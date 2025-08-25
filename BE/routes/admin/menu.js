/* Admin content router: list/review/approve/hide/restore items */

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

/// admin menu router ///


//GET /api/admin/menu - all products (hide soft-deleted recipes)
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
    const [rows] = await runQuery(sql);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN PRODUCTS LIST ERROR:', err);
    return res.status(500).json({ message: 'Error listing products', error: err.message });
  }
});

// PATCH /api/admin/menu/:id/stock - update stock and auto soft-delete/restore recipe
router.patch('/:id/stock', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

  const { stock } = req.body || {};
  const newStock = Number(stock);
  if (!Number.isFinite(newStock) || newStock < 0) {
    return res.status(400).json({ message: 'Invalid stock value' });
  }

  try {
    // Ensure product exists and get linked recipe
    const [prodRows] = await runQuery(
      `SELECT p.product_id, p.recipe_id, p.stock AS old_stock FROM products p WHERE p.product_id = ?`,
      [productId]
    );
    if (!prodRows || prodRows.length === 0) return res.status(404).json({ message: 'Product not found' });
    const recipeId = prodRows[0].recipe_id;
    const oldStock = Number(prodRows[0].old_stock);
    if (!recipeId) return res.status(422).json({ message: 'Product is not linked to a recipe' });

    // Update stock
    await runQuery(`UPDATE products SET stock = ? WHERE product_id = ?`, [newStock, productId]);

    // Auto soft-delete when stock == 0, restore when stock > 0
    if (newStock === 0) {
      await runQuery(`UPDATE recipes SET deleted_at = IFNULL(deleted_at, NOW()) WHERE recipe_id = ?`, [recipeId]);
    } else if (newStock > 0) {
      await runQuery(`UPDATE recipes SET deleted_at = NULL WHERE recipe_id = ?`, [recipeId]);
    }

    const notifyAdmin = (Number.isFinite(oldStock) ? oldStock : Infinity) > 10 && newStock <= 10;

    return res.json({
      message: 'Stock updated',
      product_id: productId,
      recipe_id: recipeId,
      stock: newStock,
      recipe_deleted: newStock === 0,
      notify_admin: notifyAdmin,
    });
  } catch (err) {
    console.error('ADMIN PRODUCT STOCK UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Error updating stock', error: err.message });
  }
});

//GET /api/admin/menu/:id -single product
router.get('/:id', async (req, res) => {
  try {
    const baseSelect = `
      SELECT 
        *
      FROM products 
      WHERE product_id = ?
    `;
    const [rows] = await runQuery(`${baseSelect}`, [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('ADMIN PRODUCTS GET ERROR:', err);
    return res.status(500).json({ message: 'Error fetching product', error: err.message });
  }
});

// GET /api/admin/menu/search
// Query params (all optional):
//   q (substring match on recipe name), minPrice, maxPrice, minCalories, maxCalories, dietType, category
//   includeDeleted ("true" to include soft-deleted), limit (default 20, max 100), offset (default 0)
router.get('/search', async (req, res) => {
  try {
    const qStr = (req.query.q || '').toString().trim();
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';

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

    if (!includeDeleted) {
      where.push('r.deleted_at IS NULL');
    }
    if (qStr) {
      where.push('r.name LIKE ?');
      whereParams.push(`%${qStr}%`);
    }
    // Price filter based on recipe price
    if (Number.isFinite(minP) && Number.isFinite(maxP)) {
      where.push('r.price BETWEEN ? AND ?');
      whereParams.push(minP, maxP);
    } else if (Number.isFinite(minP)) {
      where.push('r.price >= ?');
      whereParams.push(minP);
    } else if (Number.isFinite(maxP)) {
      where.push('r.price <= ?');
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

    const [countRows] = await runQuery(countSql, [...whereParams]);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    const [rows] = await runQuery(selectSql, [...whereParams, lim, off]);
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('ADMIN PRODUCTS SEARCH ERROR:', err);
    return res.status(500).json({ message: 'Error searching products', error: err.message });
  }
});

// DELETE /api/admin/products/:id - soft delete via linked recipe
router.delete('/products/:id', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

  try {
    // Find linked recipe
    const [rows] = await runQuery(
      `SELECT p.product_id, p.recipe_id FROM products p WHERE p.product_id = ?`,
      [productId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    const recipeId = rows[0].recipe_id;
    if (!recipeId) return res.status(422).json({ message: 'Product is not linked to a recipe' });

    // Soft delete the recipe
    await runQuery(`UPDATE recipes SET deleted_at = NOW() WHERE recipe_id = ?`, [recipeId]);
    return res.json({ message: 'Product soft-deleted via linked recipe', product_id: productId, recipe_id: recipeId });
  } catch (err) {
    console.error('ADMIN PRODUCT DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
});

// PATCH /api/admin/products/:id/stock - update stock and auto soft-delete/restore recipe
router.patch('/products/:id/stock', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

  const { stock } = req.body || {};
  const newStock = Number(stock);
  if (!Number.isFinite(newStock) || newStock < 0) {
    return res.status(400).json({ message: 'Invalid stock value' });
  }

  try {
    // Ensure product exists and get linked recipe
    const [prodRows] = await runQuery(
      `SELECT p.product_id, p.recipe_id FROM products p WHERE p.product_id = ?`,
      [productId]
    );
    if (!prodRows || prodRows.length === 0) return res.status(404).json({ message: 'Product not found' });
    const recipeId = prodRows[0].recipe_id;
    if (!recipeId) return res.status(422).json({ message: 'Product is not linked to a recipe' });

    // Update stock
    await runQuery(`UPDATE products SET stock = ? WHERE product_id = ?`, [newStock, productId]);

    // Auto soft-delete when stock == 0, restore when stock > 0
    if (newStock === 0) {
      await runQuery(`UPDATE recipes SET deleted_at = IFNULL(deleted_at, NOW()) WHERE recipe_id = ?`, [recipeId]);
    } else if (newStock > 0) {
      await runQuery(`UPDATE recipes SET deleted_at = NULL WHERE recipe_id = ?`, [recipeId]);
    }

    return res.json({
      message: 'Stock updated',
      product_id: productId,
      recipe_id: recipeId,
      stock: newStock,
      recipe_deleted: newStock === 0,
    });
  } catch (err) {
    console.error('ADMIN PRODUCT STOCK UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Error updating stock', error: err.message });
  }
});

// GET /api/admin/products/:id/stock
// Get stock for a specific product
router.get('/products/:id/stock', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

  try {
    const [rows] = await runQuery(
      `SELECT p.stock FROM products p WHERE p.product_id = ?`,
      [productId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    return res.json(rows[0].stock);
  } catch (err) {
    console.error('ADMIN PRODUCT STOCK GET ERROR:', err);
    return res.status(500).json({ message: 'Error fetching stock', error: err.message });
  }
});

// PATCH /api/admin/products/:id/price
// Update price by percent or factor
router.patch('/:id/price', async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid product id' });

  const { percent, mode, factor } = req.body || {};

  let applyFactor = Number(factor);
  if (!Number.isFinite(applyFactor)) {
    const pct = Number(percent);
    if (!Number.isFinite(pct)) {
      return res.status(400).json({ message: 'Provide either factor or percent' });
    }
    const m = (mode || 'increase').toString().toLowerCase();
    if (m !== 'increase' && m !== 'decrease') {
      return res.status(400).json({ message: "mode must be 'increase' or 'decrease'" });
    }
    applyFactor = m === 'increase' ? (1 + pct / 100) : (1 - pct / 100);
  }
  if (!(applyFactor > 0)) {
    return res.status(400).json({ message: 'Factor must be > 0' });
  }

  try {
    // Get stock and recipe link
    const [prodRows] = await runQuery(
      `SELECT p.product_id, p.stock FROM products p WHERE p.product_id = ?`,
      [productId]
    );
    if (!prodRows || prodRows.length === 0) return res.status(404).json({ message: 'Product not found' });
    const { stock } = prodRows[0];
    if (!(Number(stock) <= 10)) {
      return res.status(400).json({ message: 'Price can only be updated when stock <= 10' });
    }

    // Read current price
    const [recRows] = await runQuery(`SELECT price FROM products WHERE product_id = ?`, [productId]);
    if (!recRows || recRows.length === 0) return res.status(404).json({ message: 'Linked recipe not found' });
    const oldPrice = Number(recRows[0].price);
    const newPrice = Number((oldPrice * applyFactor).toFixed(2));

    await runQuery(`UPDATE products SET price = ? WHERE product_id = ?`, [newPrice, productId]);

    return res.json({
      message: 'Price updated',
      product_id: productId,
      stock: Number(stock),
      old_price: oldPrice,
      new_price: newPrice,
      factor: applyFactor,
    });
  } catch (err) {
    console.error('ADMIN PRODUCT PRICE UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Error updating price', error: err.message });
  }
});

// GET /api/admin/products/search
// Query params (all optional):
//   q (substring match on recipe name), minPrice, maxPrice, minCalories, maxCalories, dietType, category,maxStock
//   includeDeleted ("true" to include soft-deleted), limit (default 20, max 100), offset (default 0)
router.get('/products/search', async (req, res) => {
  try {
    const qStr = (req.query.q || '').toString().trim();
    const minP = Number(req.query.minPrice);
    const maxP = Number(req.query.maxPrice);
    const minC = Number(req.query.minCalories);
    const maxC = Number(req.query.maxCalories);
    const dietType = req.query.dietType || '';
    const category = req.query.category || '';
    const minStock = Number(req.query.minStock);
    const maxStock = Number(req.query.maxStock);
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);
    const inStockOnly = String(req.query.inStockOnly || 'false') === 'true';
    
    const where = [];
    const whereParams = [];
    
    if (!includeDeleted) {
      where.push('r.deleted_at IS NULL');
    }
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
    // Stock filters (admin-only)
    if (Number.isFinite(minStock) && Number.isFinite(maxStock)) {
      where.push('p.stock BETWEEN ? AND ?');
      whereParams.push(minStock, maxStock);
    } else if (Number.isFinite(minStock)) {
      where.push('p.stock >= ?');
      whereParams.push(minStock);
    } else if (Number.isFinite(maxStock)) {
      where.push('p.stock <= ?');
      whereParams.push(maxStock);
    }
    if (inStockOnly) {
      where.push('p.stock > 0');
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

    const [countRows] = await runQuery(countSql, [...whereParams]);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    const [rows] = await runQuery(selectSql, [...whereParams, lim, off]);
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('ADMIN PRODUCTS SEARCH ERROR:', err);
    return res.status(500).json({ message: 'Error searching products', error: err.message });
  }
});

module.exports = router;
