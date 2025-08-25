
//public recipes routes,what shows to customers

const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();
const requireActiveUser = require('../middleware/requireActiveUser');
const requireAdmin = require('../middleware/requireAdmin');

// Promise-based query helper
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// GET /api/recipes
// get all recipes
router.get('/', async (req, res) => {
  try {
    const [rows] = 
    await conn.promise().query('SELECT r.recipe_id AS id, r.name, r.description, r.calories, r.servings, r.ingredients, r.instructions, r.picture, (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_type, (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category FROM recipes r WHERE r.deleted_at IS NULL');
    res.json(rows);
  } catch (err) {
    console.error('Failed to list recipes:', err);
    res.status(500).json({ error: 'Failed to list recipes' });
  }
});

// GET /api/recipes/:id
// get single recipe
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
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
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to get recipe:', err);
    res.status(500).json({ error: 'Failed to get recipe' });
  }
});

// GET /api/recipes/search
// Query params (all optional):
//   q (substring match on name),minCalories, maxCalories,dietType,category
router.get('/search', async (req, res) => {
  try {
    const qStr = (req.query.q || '').toString().trim();

    const minC = Number(req.query.minCalories);
    const maxC = Number(req.query.maxCalories);
    const dietType = req.query.dietType || '';
    const category = req.query.category || '';
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const where = [];
    const whereParams = [];

    // exclude soft-deleted by default
    where.push('r.deleted_at IS NULL');

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
        r.ingredients,
        r.instructions,
        r.picture,
        (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_type,
        (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category
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


// PATCH /api/recipes/bulk_price
// Admin-only: update price for all products linked to the given recipe IDs
router.patch('/bulk_price', requireActiveUser, requireAdmin, async (req, res) => {
  try {
    const { recipeIds, newPrice } = req.body || {};

    // Validate inputs
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ message: 'recipeIds must be a non-empty array' });
    }
    const ids = recipeIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return res.status(400).json({ message: 'recipeIds must contain valid numeric IDs' });
    }
    const priceNum = Number(newPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'newPrice must be a non-negative number' });
    }

    // Build placeholders for IN clause
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE products SET price = ? WHERE recipe_id IN (${placeholders})`;

    const params = [priceNum, ...ids];
    const [result] = await conn.promise().query(sql, params);

    return res.json({
      success: true,
      updatedCount: result?.affectedRows || 0,
      recipeIds: ids,
      newPrice: priceNum,
    });
  } catch (err) {
    console.error('BULK PRICE UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Failed to update prices', error: err.message });
  }
});




module.exports = router;
