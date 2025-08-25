/* Admin content router: list/review/approve/hide/restore items */

const express = require('express');
const db = require('../../dbSingleton');
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

/// admin recipes router ///



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

// GET /api/admin/recipes/:id
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
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Failed to get recipe:', err);
    res.status(500).json({ error: 'Failed to get recipe' });
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
    return res.json({ id: req.params.id, restored: true });
  } catch (err) {
    console.error('ADMIN RECIPES RESTORE ERROR:', err);
    return res.status(500).json({ message: 'Error restoring recipe', error: err.message });
  }
});

module.exports = router;
