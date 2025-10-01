/* Admin content router: list/review/approve/hide/restore items */

const express = require('express');
const db = require('../../dbSingleton');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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

// PATCH /api/admin/recipes/:id/product
// Update product price/stock by recipe_id (admin utility from modal)
router.patch('/:id/product', async (req, res) => {
  try {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ message: 'Invalid recipe id' });
    const { price, stock, discounted_price, clear_discount } = req.body || {};
    const sets = [];
    const params = [];
    // We'll need current price to validate discounted_price if provided
    let currentPrice = null;
    try {
      const rows = await query('SELECT price FROM products WHERE recipe_id = ? LIMIT 1', [recipeId]);
      if (rows && rows[0] && rows[0].price != null) currentPrice = Number(rows[0].price);
    } catch (_) {}
    if (price != null) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ message: 'price must be a non-negative number' });
      }
      sets.push('price = ?');
      params.push(p);
      currentPrice = p; // if price is being updated in same request, use it as base for validation
    }
    if (stock != null) {
      const s = Number(stock);
      if (!Number.isFinite(s) || s < 0 || !Number.isInteger(s)) {
        return res.status(400).json({ message: 'stock must be an integer >= 0' });
      }
      sets.push('stock = ?');
      params.push(s);
    }
    if (typeof clear_discount !== 'undefined' && clear_discount) {
      sets.push('discounted_price = NULL');
    } else if (discounted_price != null) {
      const dp = Number(discounted_price);
      if (!Number.isFinite(dp) || dp < 0) {
        return res.status(400).json({ message: 'discounted_price must be a non-negative number' });
      }
      // Validate discounted_price < price
      const base = Number.isFinite(Number(currentPrice)) ? Number(currentPrice) : null;
      if (Number.isFinite(base) && base <= 0) {
        return res.status(400).json({ message: 'Cannot apply discount when price <= 0' });
      }
      if (dp <= 0) {
        return res.status(400).json({ message: 'discounted_price must be greater than 0' });
      }
      if (Number.isFinite(base) && dp >= base) {
        return res.status(400).json({ message: 'discounted_price must be less than price' });
      }
      sets.push('discounted_price = ?');
      params.push(dp);
    }
    if (sets.length === 0) return res.status(400).json({ message: 'No fields to update' });
    params.push(recipeId);
    const sql = `UPDATE products SET ${sets.join(', ')} WHERE recipe_id = ?`;
    const [result] = await conn.promise().query(sql, params);
    return res.json({ success: true, affected: result?.affectedRows || 0 });
  } catch (err) {
    console.error('ADMIN UPDATE PRODUCT ERROR:', err);
    return res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// POST /api/admin/recipes/discount/bulk
// Apply a percentage discount to multiple recipes by recipe_id.
// Body: { recipeIds: number[], percent: number(1..99) }
router.post('/discount/bulk', async (req, res) => {
  try {
    const { recipeIds, percent } = req.body || {};
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ message: 'recipeIds must be a non-empty array' });
    }
    const ids = recipeIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return res.status(400).json({ message: 'recipeIds must contain valid numeric IDs' });
    }
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      return res.status(400).json({ message: 'percent must be between 1 and 99' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE products SET discounted_price = ROUND(price * (100 - ?) / 100, 2) WHERE price > 0 AND recipe_id IN (${placeholders})`;
    const [result] = await conn.promise().query(sql, [pct, ...ids]);
    return res.json({ success: true, affected: result?.affectedRows || 0, percent: pct, recipeIds: ids });
  } catch (err) {
    console.error('ADMIN BULK DISCOUNT ERROR:', err);
    return res.status(500).json({ message: 'Failed to apply bulk discount', error: err.message });
  }
});

// POST /api/admin/recipes/discount/clear
// Clear discounts for multiple recipes
// Body: { recipeIds: number[] }
router.post('/discount/clear', async (req, res) => {
  try {
    const { recipeIds } = req.body || {};
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ message: 'recipeIds must be a non-empty array' });
    }
    const ids = recipeIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return res.status(400).json({ message: 'recipeIds must contain valid numeric IDs' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE products SET discounted_price = NULL WHERE recipe_id IN (${placeholders})`;
    const [result] = await conn.promise().query(sql, ids);
    return res.json({ success: true, affected: result?.affectedRows || 0, recipeIds: ids });
  } catch (err) {
    console.error('ADMIN BULK CLEAR DISCOUNT ERROR:', err);
    return res.status(500).json({ message: 'Failed to clear discounts', error: err.message });
  }
});

/// admin recipes router ///



// Ensure upload route is registered once at top-level
if (!router._uploadConfigured) {
  // Configure multer storage under backend /uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
  }
  const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safe = String(path.basename(file.originalname || 'image', ext)).replace(/[^a-z0-9_\-]+/gi, '_');
      cb(null, `${Date.now()}_${safe}${ext}`);
    }
  });
  const upload = multer({ storage });

  // POST /api/admin/recipes/upload-image
  router.post('/upload-image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      const relPath = `uploads/${req.file.filename}`;
      const url = `http://localhost:3000/${relPath}`;
      return res.status(201).json({ filename: req.file.filename, path: relPath, url });
    } catch (err) {
      console.error('UPLOAD IMAGE ERROR:', err);
      return res.status(500).json({ message: 'Failed to upload image', error: err.message });
    }
  });
  router._uploadConfigured = true;
}

// GET /api/admin/recipes
// get all recipes
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT 
         r.recipe_id AS id, r.name, r.description, r.calories, r.servings,
         r.ingredients, r.instructions, r.picture,
         (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_type,
         (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category
       FROM recipes r
       WHERE r.deleted_at IS NULL`
    );
    return res.json(rows);
  } catch (err) {
    console.error('Failed to list recipes:', err);
    res.status(500).json({ error: 'Failed to list recipes' });
  }
});

// GET /api/admin/recipes/search
// Query params (all optional):
//   q (substring match on name),minCalories, maxCalories,dietType,category
//   includeDeleted ("true" to include soft-deleted), limit (default 20, max 100), offset (default 0)
router.get('/search', async (req, res) => {
  try {
    const qStr = (req.query.q || '').toString().trim();
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';
    const minC = Number(req.query.minCalories);
    const maxC = Number(req.query.maxCalories);
    const dietType = req.query.dietType || '';
    const category = req.query.category || '';
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const where = [];
    const whereParams = [];

    if (qStr) {
      where.push('r.name LIKE ?');
      whereParams.push(`%${qStr}%`);
    }
    //isFinite checks if the values are finite numbers(not infinite or NaN)
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
    if (!includeDeleted) {
      where.push('r.deleted_at IS NULL');
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countSql = `
      SELECT COUNT(*) AS total
      FROM recipes r
      ${whereSql}
    `;
    const selectSql = `
      SELECT 
        r.recipe_id AS id,
        r.name,
        r.description,
        r.calories,
        r.servings,
        r.ingredients,
        r.instructions,
        r.picture,
        (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_type,
        (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category,
        r.deleted_at
      FROM recipes r
      ${whereSql}
      ORDER BY r.recipe_id DESC
      LIMIT ? OFFSET ?
    `;
    const countRows = await query(countSql, [...whereParams]);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    const rows = await query(selectSql, [...whereParams, lim, off]);
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('ADMIN RECIPES SEARCH ERROR:', err);
    return res.status(500).json({ message: 'Error searching recipes', error: err.message });
  }
});

// GET /api/admin/recipes/:id
// get single recipe
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid recipe id' });
    }
    const sql = `
    SELECT 
      r.recipe_id AS id,
      r.name, r.description, r.calories, r.servings,
      r.ingredients, r.instructions, r.picture,
      (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_type,
      (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category
      FROM recipes r
      WHERE r.recipe_id = ? AND r.deleted_at IS NULL
    `;
    const params = [id];
    const rows = await query(sql, params);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Failed to get recipe:', err);
    res.status(500).json({ error: 'Failed to get recipe' });
  }
});


//POST /api/admin/recipes
//create new recipe
router.post('/', async (req, res) => {
  try {
    const { name, description, calories, servings, ingredients, instructions,picture,diet_type_id,category_id } = req.body;
    const result = await query(
      'INSERT INTO recipes (name, description,calories,servings, ingredients, instructions,picture,diet_type_id,category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, calories, servings, ingredients, instructions,picture,diet_type_id,category_id]
    );
    return res.json({ id: result.insertId });
  } catch (err) {
    console.error('ADMIN RECIPES CREATE ERROR:', err);
    return res.status(500).json({ message: 'Error creating recipe', error: err.message });
  }
});
//PUT /api/admin/recipes/:id
//update recipe
router.put('/:id', async (req, res) => {
  try {
    const { name, description,calories, servings, ingredients, instructions,picture,diet_type_id,category_id } = req.body;
    await query(
      'UPDATE recipes SET name = ?, description = ?, calories = ?, servings = ?, ingredients = ?, instructions = ?, picture = ?, diet_type_id = ?, category_id = ? WHERE recipe_id = ?',
      [name, description, calories, servings, ingredients, instructions,picture,diet_type_id,category_id,req.params.id]
    );
    return res.json({ id: req.params.id });
  } catch (err) {
    console.error('ADMIN RECIPES UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Error updating recipe', error: err.message });
  }
});

//DELETE /api/admin/recipes/:id
//delete recipe
router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE recipes SET deleted_at = NOW() WHERE recipe_id = ?', [req.params.id]);
    try {
      await query('UPDATE products SET deleted_at = NOW() WHERE recipe_id = ?', [req.params.id]);
    } catch (e) {
      // If products.deleted_at doesn't exist, ignore silently
    }
    return res.json({ id: req.params.id, deleted: true });
  } catch (err) {
    console.error('ADMIN RECIPES DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting recipe', error: err.message });
  }
});

// POST /api/admin/recipes/:id/restore
// restore soft-deleted recipe
router.post('/:id/restore', async (req, res) => {
  try {
    await query('UPDATE recipes SET deleted_at = NULL WHERE recipe_id = ?', [req.params.id]);
    try {
      await query('UPDATE products SET deleted_at = NULL WHERE recipe_id = ?', [req.params.id]);
    } catch (e) {
      // If products.deleted_at doesn't exist, ignore silently
    }
    return res.json({ id: req.params.id, restored: true });
  } catch (err) {
    console.error('ADMIN RECIPES RESTORE ERROR:', err);
    return res.status(500).json({ message: 'Error restoring recipe', error: err.message });
  }
});

module.exports = router;

// POST /api/admin/recipes/full_create
// Create recipe + product + map components by ingredient names (if provided)
router.post('/full_create', async (req, res) => {
  const {
    name,
    description,
    calories,
    servings,
    ingredients, // array of strings or single string
    instructions,
    picture,
    diet_type_id,
    category_id,
    price,
    stock = 0,
  } = req.body || {};

  const tx = conn.promise();
  try {
    await tx.query('START TRANSACTION');

    const ingArr = Array.isArray(ingredients)
      ? ingredients.map(s => String(s || '').trim()).filter(Boolean)
      : String(ingredients || '').split(/\r?\n|,\s*/).map(s => s.trim()).filter(Boolean);
    const ingredientsStr = ingArr.join(', ');

    // 1) Insert recipe
    const [insRecipe] = await tx.query(
      'INSERT INTO recipes (name, description, calories, servings, ingredients, instructions, picture, diet_type_id, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, calories, servings, ingredientsStr, instructions, picture, diet_type_id, category_id]
    );
    const recipeId = insRecipe.insertId;

    // 2) Insert product linked to recipe
    const priceNum = Number(price);
    const stockNum = Number(stock) || 0;
    await tx.query(
      'INSERT INTO products (recipe_id, price, stock) VALUES (?, ?, ?)',
      [recipeId, priceNum, stockNum]
    );
    // Optionally mirror selected fields into products if those columns exist in your schema
    try {
      await tx.query(
        'UPDATE products SET name = ?, calories = ?, diet_type_id = ?, category_id = ? WHERE recipe_id = ?',
        [name || null, (Number.isFinite(Number(calories)) ? Number(calories) : null), diet_type_id || null, category_id || null, recipeId]
      );
    } catch (e) {
      // Silently ignore if columns don't exist; many schemas keep these only in recipes
    }

    // 3) Map ingredients to components (ensure components exist), link to product via product_contains_components
    if (ingArr.length) {
      // resolve product_id for this recipe (assuming 1:1 for now)
      const [prodRows] = await tx.query('SELECT product_id FROM products WHERE recipe_id = ? ORDER BY product_id DESC LIMIT 1', [recipeId]);
      const productId = prodRows && prodRows[0] ? prodRows[0].product_id : null;
      if (productId) {
        for (const compNameRaw of ingArr) {
          const compName = String(compNameRaw).trim();
          if (!compName) continue;
          // Try find component by exact name
          let compId = null;
          try {
            const [rows] = await tx.query('SELECT comp_id FROM components WHERE name = ? LIMIT 1', [compName]);
            if (rows && rows[0] && rows[0].comp_id) compId = rows[0].comp_id;
          } catch {}
          // Insert if missing
          if (!compId) {
            try {
              const [ins] = await tx.query('INSERT INTO components (name) VALUES (?)', [compName]);
              compId = ins && ins.insertId ? ins.insertId : null;
            } catch (e) {
              // Race: another insert may have happened; re-select
              const [rows2] = await tx.query('SELECT comp_id FROM components WHERE name = ? LIMIT 1', [compName]);
              if (rows2 && rows2[0] && rows2[0].comp_id) compId = rows2[0].comp_id;
            }
          }
          // Link component to product
          if (compId) {
            await tx.query('INSERT IGNORE INTO product_contains_components (product_id, comp_id) VALUES (?, ?)', [productId, compId]);
          }
        }
      }
    }

    await tx.query('COMMIT');
    return res.status(201).json({ recipe_id: recipeId });
  } catch (err) {
    try { await tx.query('ROLLBACK'); } catch {}
    console.error('ADMIN FULL CREATE ERROR:', err);
    return res.status(500).json({ message: 'Error creating recipe with product/components', error: err.message });
  }
});
