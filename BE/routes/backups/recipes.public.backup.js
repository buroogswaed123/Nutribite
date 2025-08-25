const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();

// Promise-based query helper
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Map a DB row to API shape
function mapRecipeRow(r) {
  return {
    recipe_id: r.recipe_id,
    name: r.name,
    description: r.description,
    calories: r.calories,
    servings: r.servings,
    ingredients: r.ingredients,
    instructions: r.instructions,
    picture: r.picture,
    diet_type_id: r.diet_type_id,
    category_id: r.category_id,
    category_name: r.category_name || null,
    diet_name: r.diet_name || null,
    diet_description: r.diet_description || null,
  };
}

// GET /api/recipes
// Optional filters: q, category_id, diet_type_id, includeDeleted, limit, offset
router.get('/', async (req, res) => {
  try {
    const { q, category_id, diet_type_id } = req.query;
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';
    let { limit, offset } = req.query;
    const where = [];
    const params = [];

    if (q) {
      where.push('(r.name LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ? )');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (category_id) {
      where.push('r.category_id = ?');
      params.push(Number(category_id));
    }
    if (diet_type_id) {
      where.push('r.diet_type_id = ?');
      params.push(Number(diet_type_id));
    }

    let sql = `
      SELECT r.*, c.name AS category_name, d.name AS diet_name, d.description AS diet_description
      FROM recipes r
      LEFT JOIN categories c ON c.category_id = r.category_id
      LEFT JOIN diet_type d ON d.diet_id = r.diet_type_id
    `;
    if (!includeDeleted) {
      where.push('r.deleted_at IS NULL');
    }
    if (where.length) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY r.recipe_id DESC';

    limit = Number(limit);
    offset = Number(offset);
    if (!Number.isNaN(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
      if (!Number.isNaN(offset) && offset >= 0) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }

    const rows = await query(sql, params);
    res.json({ items: rows.map(mapRecipeRow) });
  } catch (err) {
    console.error('Failed to list recipes:', err);
    res.status(500).json({ error: 'Failed to list recipes' });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';
    let sql = `
      SELECT r.*, c.name AS category_name, d.name AS diet_name, d.description AS diet_description
      FROM recipes r
      LEFT JOIN categories c ON c.category_id = r.category_id
      LEFT JOIN diet_type d ON d.diet_id = r.diet_type_id
      WHERE r.recipe_id = ?
    `;
    const params = [id];
    if (!includeDeleted) {
      sql += ' AND r.deleted_at IS NULL';
    }
    const rows = await query(sql, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ item: mapRecipeRow(rows[0]) });
  } catch (err) {
    console.error('Failed to get recipe:', err);
    res.status(500).json({ error: 'Failed to get recipe' });
  }
});

module.exports = router;
