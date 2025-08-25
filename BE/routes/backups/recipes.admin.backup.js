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

/// admin recipes router ///


//GET /api/admin/recipes -all recipes
router.get('/recipes', async (req, res) => {
  try {
    const baseSelect = `
      SELECT 
       *
      FROM recipes
    `;
    const [rows] = await runQuery(baseSelect);
    return res.json(rows);
  } catch (err) {
    console.error('ADMIN PRODUCTS LIST ERROR:', err);
    return res.status(500).json({ message: 'Error listing products', error: err.message });
  }
});

//GET /api/admin/recipes/:id -single recipe
router.get('/recipes/:id', async (req, res) => {
  try {
    const baseSelect = `
      SELECT 
       *
      FROM recipes
      WHERE recipe_id = ?
    `;
    const [rows] = await runQuery(`${baseSelect}`, [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('ADMIN RECIPES GET ERROR:', err);
    return res.status(500).json({ message: 'Error fetching recipe', error: err.message });
  }
});

// GET /api/admin/recipes/search
// Query params (all optional):
//   q (substring match on name), minPrice, maxPrice, minCalories, maxCalories,dietType,category
//   includeDeleted ("true" to include soft-deleted), limit (default 20, max 100), offset (default 0)
router.get('/recipes/search', async (req, res) => {
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
      where.push('deleted_at IS NULL');
    }
    if (qStr) {
      where.push('name LIKE ?');
      whereParams.push(`%${qStr}%`);
    }
    //isFinite checks if the values are finite numbers(not infinite or NaN)
    if (Number.isFinite(minP) && Number.isFinite(maxP)) {
      where.push('price BETWEEN ? AND ?');
      whereParams.push(minP, maxP);
    } else if (Number.isFinite(minP)) {
      where.push('price >= ?');
      whereParams.push(minP);
    } else if (Number.isFinite(maxP)) {
      where.push('price <= ?');
      whereParams.push(maxP);
    }
    if (Number.isFinite(minC) && Number.isFinite(maxC)) {
      where.push('calories BETWEEN ? AND ?');
      whereParams.push(minC, maxC);
    } else if (Number.isFinite(minC)) {
      where.push('calories >= ?');
      whereParams.push(minC);
    } else if (Number.isFinite(maxC)) {
      where.push('calories <= ?');
      whereParams.push(maxC);
    }
    if (dietType) {
      where.push('diet_type_id = ?');
      whereParams.push(dietType);
    }
    if (category) {
      where.push('category_id = ?');
      whereParams.push(category);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM recipes
      ${whereSql}
    `;
    const selectSql = `
      SELECT 
        recipe_id AS id,
        name,
        description,
        price,
        calories,
        ingredients,
        instructions,
        picture,
        diet_type_id,
        category_id,
        deleted_at,
        created_at,
        updated_at
      FROM recipes
      ${whereSql}
      ORDER BY recipe_id DESC
      LIMIT ? OFFSET ?
    `;

    const [countRows] = await runQuery(countSql, [...whereParams]);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    const [rows] = await runQuery(selectSql, [...whereParams, lim, off]);
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('ADMIN RECIPES SEARCH ERROR:', err);
    return res.status(500).json({ message: 'Error searching recipes', error: err.message });
  }
});


//POST /api/admin/recipes
//create new recipe
router.post('/recipes', async (req, res) => {
  try {
    const { name, description, price, calories, ingredients, instructions,picture,diet_type_id,category_id } = req.body;
    const [result] = await runQuery(
      'INSERT INTO recipes (name, description, price, calories, ingredients, instructions,picture,diet_type_id,category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, calories, ingredients, instructions,picture,diet_type_id,category_id]
    );
    return res.json({ id: result.insertId });
  } catch (err) {
    console.error('ADMIN RECIPES CREATE ERROR:', err);
    return res.status(500).json({ message: 'Error creating recipe', error: err.message });
  }
});
//PUT /api/admin/recipes/:id
//update recipe
router.put('/recipes/:id', async (req, res) => {
  try {
    const { name, description, price, calories, ingredients, instructions,picture,diet_type_id,category_id } = req.body;
    const [result] = await runQuery(
      'UPDATE recipes SET name = ?, description = ?, price = ?, calories = ?, ingredients = ?, instructions = ?,picture = ?,diet_type_id = ?,category_id = ? WHERE id = ?',
      [name, description, price, calories, ingredients, instructions,picture,diet_type_id,category_id,req.params.id]
    );
    return res.json({ id: req.params.id });
  } catch (err) {
    console.error('ADMIN RECIPES UPDATE ERROR:', err);
    return res.status(500).json({ message: 'Error updating recipe', error: err.message });
  }
});

//DELETE /api/admin/recipes/:id
//delete recipe
router.delete('/recipes/:id', async (req, res) => {
  try {
    const [result] = await runQuery('UPDATE recipes SET deleted_at = NOW() WHERE recipe_id = ?', [req.params.id]);
    return res.json({ id: req.params.id, deleted: true });
  } catch (err) {
    console.error('ADMIN RECIPES DELETE ERROR:', err);
    return res.status(500).json({ message: 'Error deleting recipe', error: err.message });
  }
});

// POST /api/admin/recipes/:id/restore
// restore soft-deleted recipe
router.post('/recipes/:id/restore', async (req, res) => {
  try {
    const [result] = await runQuery('UPDATE recipes SET deleted_at = NULL WHERE recipe_id = ?', [req.params.id]);
    return res.json({ id: req.params.id, restored: true });
  } catch (err) {
    console.error('ADMIN RECIPES RESTORE ERROR:', err);
    return res.status(500).json({ message: 'Error restoring recipe', error: err.message });
  }
});

module.exports = router;
