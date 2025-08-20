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
// Optional filters: q, category_id, diet_type_id, limit, offset
router.get('/', async (req, res) => {
  try {
    const { q, category_id, diet_type_id } = req.query;
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
    const rows = await query(
      `SELECT r.*, c.name AS category_name, d.name AS diet_name, d.description AS diet_description
       FROM recipes r
       LEFT JOIN categories c ON c.category_id = r.category_id
       LEFT JOIN diet_type d ON d.diet_id = r.diet_type_id
       WHERE r.recipe_id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ item: mapRecipeRow(rows[0]) });
  } catch (err) {
    console.error('Failed to get recipe:', err);
    res.status(500).json({ error: 'Failed to get recipe' });
  }
});

// POST /api/recipes
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      calories,
      servings,
      ingredients,
      instructions,
      picture,
      diet_type_id,
      category_id,
    } = req.body || {};

    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (calories == null) return res.status(400).json({ error: 'calories is required' });
    if (servings == null) return res.status(400).json({ error: 'servings is required' });
    if (!ingredients) return res.status(400).json({ error: 'ingredients is required' });
    if (!instructions) return res.status(400).json({ error: 'instructions is required' });
    if (!picture) return res.status(400).json({ error: 'picture is required' });
    if (!diet_type_id) return res.status(400).json({ error: 'diet_type_id is required' });
    if (!category_id) return res.status(400).json({ error: 'category_id is required' });

    const result = await query(
      `INSERT INTO recipes 
       (name, description, calories, servings, ingredients, instructions, picture, diet_type_id, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || null,
        Number(calories),
        Number(servings),
        ingredients,
        instructions,
        picture,
        Number(diet_type_id),
        Number(category_id),
      ]
    );
    const created = await query('SELECT * FROM recipes WHERE recipe_id = ?', [result.insertId]);
    res.status(201).json({ item: mapRecipeRow(created[0]) });
  } catch (err) {
    console.error('Failed to create recipe:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// PUT /api/recipes/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT recipe_id FROM recipes WHERE recipe_id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const fields = ['name','description','calories','servings','ingredients','instructions','picture','diet_type_id','category_id'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (req.body.hasOwnProperty(f)) {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const sql = `UPDATE recipes SET ${sets.join(', ')} WHERE recipe_id = ?`;
    params.push(id);
    await query(sql, params);
    const updated = await query(
      `SELECT r.*, c.name AS category_name, d.name AS diet_name, d.description AS diet_description
       FROM recipes r
       LEFT JOIN categories c ON c.category_id = r.category_id
       LEFT JOIN diet_type d ON d.diet_id = r.diet_type_id
       WHERE r.recipe_id = ?`,
      [id]
    );
    res.json({ item: mapRecipeRow(updated[0]) });
  } catch (err) {
    console.error('Failed to update recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT recipe_id FROM recipes WHERE recipe_id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM recipes WHERE recipe_id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete recipe:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

module.exports = router;
