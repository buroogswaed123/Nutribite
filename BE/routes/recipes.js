
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

// GET /api/recipes/top-rated?limit=5
// Return top-N recipes by rating (highest first)
router.get('/top-rated', async (req, res) => {
  try {
    const lim = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const rows = await query(
      `SELECT r.recipe_id AS id, r.name, r.rating
       FROM recipes r
       WHERE r.deleted_at IS NULL
       ORDER BY r.rating IS NULL, r.rating DESC
       LIMIT ?`,
      [lim]
    );
    return res.json({ items: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching top-rated' });
  }
});
  });
}

// GET /api/recipes/macro_search
// Query: macro=protein|carbs|fats, min (number), max (number), maxCalories (optional), minCalories (optional)
// Returns minimal fields for quick filtering
router.get('/macro_search', async (req, res) => {
  try {
    const macroKey = String(req.query.macro || '').toLowerCase();
    const allowed = { protein: 'protein_g', carbs: 'carbs_g', fats: 'fats_g' };
    const macroCol = allowed[macroKey];
    if (!macroCol) return res.status(400).json({ message: 'macro must be one of protein|carbs|fats' });
    const minVal = req.query.min != null ? Number(req.query.min) : null;
    const maxVal = req.query.max != null ? Number(req.query.max) : null;
    const minCal = req.query.minCalories != null ? Number(req.query.minCalories) : null;
    const maxCal = req.query.maxCalories != null ? Number(req.query.maxCalories) : null;
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const cond = ['r.deleted_at IS NULL'];
    const args = [];
    if (Number.isFinite(minCal)) { cond.push('r.calories >= ?'); args.push(minCal); }
    if (Number.isFinite(maxCal)) { cond.push('r.calories <= ?'); args.push(maxCal); }
    if (Number.isFinite(minVal)) { cond.push(`r.${macroCol} >= ?`); args.push(minVal); }
    if (Number.isFinite(maxVal)) { cond.push(`r.${macroCol} <= ?`); args.push(maxVal); }
    const where = `WHERE ${cond.join(' AND ')}`;

    const countRows = await query(`SELECT COUNT(*) AS total FROM recipes r ${where}`, args);
    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    const items = await query(
      `SELECT r.recipe_id AS id, r.name, r.calories, r.protein_g, r.carbs_g, r.fats_g FROM recipes r ${where} ORDER BY r.recipe_id DESC LIMIT ? OFFSET ?`,
      [...args, lim, off]
    );
    return res.json({ items, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('RECIPES MACRO_SEARCH ERROR:', err);
    return res.status(500).json({ message: 'Error searching by macros', error: err.message });
  }
});

async function ensureRatingsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS recipe_ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipe_id INT NOT NULL,
      customer_id INT NOT NULL,
      stars TINYINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_recipe_customer (recipe_id, customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await conn.promise().query(sql);
}

async function getCustomerIdFromSession(req) {
  const userId = req.session && req.session.user_id;
  if (!userId) return null;
  const [rows] = await conn.promise().query('SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1', [userId]);
  return rows && rows[0] ? rows[0].cust_id : null;
}

// GET /api/recipes
// get all recipes
router.get('/', async (req, res) => {
  try {
    const [rows] = 
    await conn.promise().query('SELECT r.recipe_id AS id, r.name, r.description, r.calories, r.protein_g, r.carbs_g, r.fats_g, r.servings, r.ingredients, r.instructions, r.picture, r.rating AS rating_avg, r.category_id AS category_id, r.diet_type_id AS diet_type_id, (SELECT dt.name FROM diet_type dt WHERE dt.diet_id = r.diet_type_id LIMIT 1) AS diet_type, (SELECT c.name FROM categories c WHERE c.category_id = r.category_id LIMIT 1) AS category FROM recipes r WHERE r.deleted_at IS NULL');
    res.json(rows);
  } catch (err) {
    console.error('Failed to list recipes:', err);
    res.status(500).json({ error: 'Failed to list recipes' });
  }
});

// GET /api/recipes/search_by_catname
// Filters by recipe name LIKE and category name LIKE, joining categories directly.
router.get('/search_by_catname', async (req, res) => {
  try {
    const q = String(req.query.q||'').trim(), c = String(req.query.categoryName||'').trim(); //q:substring match on recipes.name, categoryName:substring match on categories.name
    const lim = Math.min(Math.max(+req.query.limit||20,1),100), off = Math.max(+req.query.offset||0,0); //limit (default 20, max 100), offset (default 0)
    const base = 'FROM recipes r INNER JOIN categories c ON c.category_id=r.category_id';
    const cond = ['r.deleted_at IS NULL'], args=[]; //exclude soft-deleted by default
    if (q) { cond.push('r.name LIKE ?'); args.push(`%${q}%`); }
    if (c) { cond.push('c.name LIKE ?'); args.push(`%${c}%`); }
    const where = `WHERE ${cond.join(' AND ')}`;
    const total = Number((await query(`SELECT COUNT(*) total ${base} ${where}`, args))[0]?.total||0);
    const items = await query(`SELECT r.recipe_id id, r.name, c.name category_name ${base} ${where} ORDER BY r.recipe_id DESC LIMIT ? OFFSET ?`,[...args,lim,off]);
    res.json({ items, meta:{ limit:lim, offset:off, total } });
  } catch (err) { res.status(500).json({ message:'Error searching recipes by category name', error:err.message }); }
});

// GET /api/recipes/:id
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
      r.name, r.description, r.calories, r.protein_g, r.carbs_g, r.fats_g, r.servings,
      r.ingredients, r.instructions, r.picture, r.rating AS rating_avg,
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
        r.rating AS rating_avg,
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

// Ratings: GET avg/count/userStars
router.get('/:id/ratings', async (req, res) => {
  try {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ message: 'Invalid recipe id' });
    await ensureRatingsTable();

    // avg from recipes.rating (cached)
    const [rAvg] = await conn.promise().query('SELECT rating AS avg FROM recipes WHERE recipe_id = ? LIMIT 1', [recipeId]);
    const avg = rAvg && rAvg[0] && rAvg[0].avg != null ? Number(rAvg[0].avg) : null;
    const [cntRows] = await conn.promise().query('SELECT COUNT(*) AS cnt FROM recipe_ratings WHERE recipe_id = ?', [recipeId]);
    const count = cntRows && cntRows[0] ? Number(cntRows[0].cnt) : 0;

    let userStars = null;
    const custId = await getCustomerIdFromSession(req);
    if (custId) {
      const [u] = await conn.promise().query('SELECT stars FROM recipe_ratings WHERE recipe_id = ? AND customer_id = ? LIMIT 1', [recipeId, custId]);
      if (u && u[0] && u[0].stars != null) userStars = Number(u[0].stars);
    }
    return res.json({ avg, count, userStars });
  } catch (err) {
    console.error('GET ratings error:', err);
    return res.status(500).json({ message: 'Failed to get ratings', error: err.message });
  }
});

// Ratings: upsert user rating and update recipe average
router.post('/:id/ratings', requireActiveUser, async (req, res) => {
  try {
    const recipeId = Number(req.params.id);
    const stars = Number(req.body?.stars);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ message: 'Invalid recipe id' });
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) return res.status(400).json({ message: 'stars must be 1..5' });

    await ensureRatingsTable();
    const custId = await getCustomerIdFromSession(req);
    if (!custId) return res.status(401).json({ message: 'Not logged in' });

    // upsert rating
    const upsert = `
      INSERT INTO recipe_ratings (recipe_id, customer_id, stars)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE stars = VALUES(stars), updated_at = CURRENT_TIMESTAMP
    `;
    await conn.promise().query(upsert, [recipeId, custId, stars]);

    // refresh cached average
    const [avgRows] = await conn.promise().query('SELECT AVG(stars) AS avg, COUNT(*) AS cnt FROM recipe_ratings WHERE recipe_id = ?', [recipeId]);
    const avg = avgRows && avgRows[0] && avgRows[0].avg != null ? Number(avgRows[0].avg) : null;
    const count = avgRows && avgRows[0] ? Number(avgRows[0].cnt) : 0;
    await conn.promise().query('UPDATE recipes SET rating = ? WHERE recipe_id = ?', [avg, recipeId]);

    return res.json({ avg, count, userStars: stars });
  } catch (err) {
    console.error('POST ratings error:', err);
    return res.status(500).json({ message: 'Failed to save rating', error: err.message });
  }
});

// Simple helpers to build WHERE clauses safely for macro ranges
function buildRangeConds({ min, max, col }, conds, params, tableAlias = 'r') {
  const c = `${tableAlias}.${col}`;
  if (Number.isFinite(min) && Number.isFinite(max)) { conds.push(`${c} BETWEEN ? AND ?`); params.push(min, max); }
  else if (Number.isFinite(min)) { conds.push(`${c} >= ?`); params.push(min); }
  else if (Number.isFinite(max)) { conds.push(`${c} <= ?`); params.push(max); }
}

// GET /api/recipes/protein_range?min=&max=&minCalories=&maxCalories=&limit=&offset=
router.get('/protein_range', async (req, res) => {
  try {
    const min = Number(req.query.min);
    const max = Number(req.query.max);
    const minCal = Number(req.query.minCalories);
    const maxCal = Number(req.query.maxCalories);
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const cond = ['r.deleted_at IS NULL'];
    const args = [];
    if (Number.isFinite(minCal)) { cond.push('r.calories >= ?'); args.push(minCal); }
    if (Number.isFinite(maxCal)) { cond.push('r.calories <= ?'); args.push(maxCal); }
    buildRangeConds({ min, max, col: 'protein_g' }, cond, args, 'r');
    const where = `WHERE ${cond.join(' AND ')}`;

    const [countRows] = await conn.promise().query(`SELECT COUNT(*) AS total FROM recipes r ${where}`, args);
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;
    const [rows] = await conn.promise().query(
      `SELECT r.recipe_id AS id, r.name, r.calories, r.protein_g, r.carbs_g, r.fats_g, r.picture FROM recipes r ${where} ORDER BY r.recipe_id DESC LIMIT ? OFFSET ?`,
      [...args, lim, off]
    );
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('RECIPES PROTEIN_RANGE ERROR:', err);
    return res.status(500).json({ message: 'Error searching by protein range', error: err.message });
  }
});

// GET /api/recipes/carbs_range
router.get('/carbs_range', async (req, res) => {
  try {
    const min = Number(req.query.min);
    const max = Number(req.query.max);
    const minCal = Number(req.query.minCalories);
    const maxCal = Number(req.query.maxCalories);
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const cond = ['r.deleted_at IS NULL'];
    const args = [];
    if (Number.isFinite(minCal)) { cond.push('r.calories >= ?'); args.push(minCal); }
    if (Number.isFinite(maxCal)) { cond.push('r.calories <= ?'); args.push(maxCal); }
    buildRangeConds({ min, max, col: 'carbs_g' }, cond, args, 'r');
    const where = `WHERE ${cond.join(' AND ')}`;

    const [countRows] = await conn.promise().query(`SELECT COUNT(*) AS total FROM recipes r ${where}`, args);
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;
    const [rows] = await conn.promise().query(
      `SELECT r.recipe_id AS id, r.name, r.calories, r.protein_g, r.carbs_g, r.fats_g, r.picture FROM recipes r ${where} ORDER BY r.recipe_id DESC LIMIT ? OFFSET ?`,
      [...args, lim, off]
    );
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('RECIPES CARBS_RANGE ERROR:', err);
    return res.status(500).json({ message: 'Error searching by carbs range', error: err.message });
  }
});

// GET /api/recipes/fats_range
router.get('/fats_range', async (req, res) => {
  try {
    const min = Number(req.query.min);
    const max = Number(req.query.max);
    const minCal = Number(req.query.minCalories);
    const maxCal = Number(req.query.maxCalories);
    const lim = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);

    const cond = ['r.deleted_at IS NULL'];
    const args = [];
    if (Number.isFinite(minCal)) { cond.push('r.calories >= ?'); args.push(minCal); }
    if (Number.isFinite(maxCal)) { cond.push('r.calories <= ?'); args.push(maxCal); }
    buildRangeConds({ min, max, col: 'fats_g' }, cond, args, 'r');
    const where = `WHERE ${cond.join(' AND ')}`;

    const [countRows] = await conn.promise().query(`SELECT COUNT(*) AS total FROM recipes r ${where}`, args);
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;
    const [rows] = await conn.promise().query(
      `SELECT r.recipe_id AS id, r.name, r.calories, r.protein_g, r.carbs_g, r.fats_g, r.picture FROM recipes r ${where} ORDER BY r.recipe_id DESC LIMIT ? OFFSET ?`,
      [...args, lim, off]
    );
    return res.json({ items: rows, meta: { limit: lim, offset: off, total } });
  } catch (err) {
    console.error('RECIPES FATS_RANGE ERROR:', err);
    return res.status(500).json({ message: 'Error searching by fats range', error: err.message });
  }
});
