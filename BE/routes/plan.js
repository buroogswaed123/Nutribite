// routes/plan.js
const express = require('express');
const router = express.Router();
const dbSingleton = require('../dbSingleton');
const conn = dbSingleton.getConnection();
const requireActiveUser = require('../middleware/requireActiveUser');

// Helpers
function ok(res, data) { return res.json(data); }
function bad(res, msg) { return res.status(400).json({ message: msg }); }
function notFound(res, msg = 'Not found') { return res.status(404).json({ message: msg }); }
function serverErr(res, err, msg = 'Internal error') {
  console.error(msg, err);
  return res.status(500).json({ message: msg, error: err?.message || String(err) });
}

function pickPlanFields(body) {
  const fields = {
    customer_id: body.customer_id,
    age: body.age ?? null,
    gender: body.gender ?? null, // 'זכר' | 'נקבה' | 'אחר'
    height_cm: body.height_cm ?? null,
    weight_kg: body.weight_kg ?? null,
    activity_level: body.activity_level ?? null, // 'עצמוני','קל','בינוני','פעיל','פעיל מאוד'
    diet_type_id: body.diet_type_id ?? null,
    calories_per_day: body.calories_per_day ?? null,
    protein_g: body.protein_g ?? null,
    carbs_g: body.carbs_g ?? null,
    fats_g: body.fats_g ?? null,
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null
  };
  return fields;
}

function buildUpdateSet(fields) {
  const keys = [];
  const vals = [];
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined) {
      keys.push(`${k} = ?`);
      vals.push(v === '' ? null : v);
    }
  });
  return { setSql: keys.join(', '), params: vals };
}

// =========================
// Plans
// =========================

// GET /api/plan
// Optional query: customer_id
router.get('/', async (req, res) => {
  try {
    const { customer_id } = req.query;
    const where = [];
    const params = [];
    if (customer_id) {
      where.push('p.customer_id = ?');
      params.push(Number(customer_id));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await conn.promise().query(
      `
      SELECT 
        p.plan_id,
        p.customer_id,
        p.age,
        p.gender,
        p.height_cm,
        p.weight_kg,
        p.activity_level,
        p.diet_type_id,
        p.calories_per_day,
        p.protein_g,
        p.carbs_g,
        p.fats_g,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        (SELECT d.name FROM diet_type d WHERE d.diet_id = p.diet_type_id LIMIT 1) AS diet_type_name
      FROM nutritionplan p
      ${whereSql}
      ORDER BY p.plan_id DESC
      `,
      params
    );
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err, 'Failed to list plans');
  }
});

// GET /api/plan/:id  (includes products)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const [plans] = await conn.promise().query(
      `
      SELECT 
        p.plan_id,
        p.customer_id,
        p.age,
        p.gender,
        p.height_cm,
        p.weight_kg,
        p.activity_level,
        p.diet_type_id,
        p.calories_per_day,
        p.protein_g,
        p.carbs_g,
        p.fats_g,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        (SELECT d.name FROM diet_type d WHERE d.diet_id = p.diet_type_id LIMIT 1) AS diet_type_name
      FROM nutritionplan p
      WHERE p.plan_id = ?
      LIMIT 1
      `,
      [id]
    );
    if (!plans || plans.length === 0) return notFound(res, 'Plan not found');

    const [items] = await conn.promise().query(
      `
      SELECT 
        pp.plan_product_id,
        pp.plan_id,
        pp.product_id,
        pp.servings,
        p.name AS product_name,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fats_g
      FROM nutrition_plan_contains_products pp
      JOIN products p ON p.product_id = pp.product_id
      JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE pp.plan_id = ?
      ORDER BY pp.plan_product_id ASC
      `,
      [id]
    );

    return ok(res, { ...plans[0], items });
  } catch (err) {
    return serverErr(res, err, 'Failed to get plan');
  }
});

// POST /api/plan
router.post('/', requireActiveUser, async (req, res) => {
  try {
    const data = pickPlanFields(req.body || {});
    const customerIdNum = Number(data.customer_id);
    if (!Number.isFinite(customerIdNum)) return bad(res, 'customer_id is required');

    // Ensure required defaults for DB constraints
    // Default start_date to today if not provided
    const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const startDate = data.start_date ?? todayIso;
    const endDate = data.end_date ?? null;

    const [result] = await conn.promise().query(
      `
      INSERT INTO nutritionplan
      (customer_id, age, gender, height_cm, weight_kg, activity_level, diet_type_id, calories_per_day, protein_g, carbs_g, fats_g, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customerIdNum,
        data.age ?? null,
        data.gender ?? null,
        data.height_cm ?? null,
        data.weight_kg ?? null,
        data.activity_level ?? null,
        data.diet_type_id ?? null,
        data.calories_per_day ?? null,
        data.protein_g ?? null,
        data.carbs_g ?? null,
        data.fats_g ?? null,
        startDate,
        endDate
      ]
    );

    return ok(res, { success: true, plan_id: result.insertId });
  } catch (err) {
    return serverErr(res, err, 'Failed to create plan');
  }
});

// PUT /api/plan/:id  (partial supported)
router.put('/:id', requireActiveUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const fields = pickPlanFields(req.body || {});
    if (fields.customer_id !== undefined && !Number.isFinite(Number(fields.customer_id))) {
      return bad(res, 'Invalid customer_id');
    }

    const { setSql, params } = buildUpdateSet(fields);
    if (!setSql) return bad(res, 'No fields to update');

    const [result] = await conn.promise().query(
      `UPDATE nutritionplan SET ${setSql} WHERE plan_id = ?`,
      [...params, id]
    );
    if (result.affectedRows === 0) return notFound(res, 'Plan not found');

    return ok(res, { success: true, plan_id: id });
  } catch (err) {
    return serverErr(res, err, 'Failed to update plan');
  }
});

// DELETE /api/plan/:id  (deletes links then plan)
router.delete('/:id', requireActiveUser, async (req, res) => {
  const tx = conn.promise();
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    await tx.query('DELETE FROM nutrition_plan_contains_products WHERE plan_id = ?', [id]);
    const [result] = await tx.query('DELETE FROM nutritionplan WHERE plan_id = ?', [id]);
    if (result.affectedRows === 0) return notFound(res, 'Plan not found');

    return ok(res, { success: true, deleted: id });
  } catch (err) {
    return serverErr(res, err, 'Failed to delete plan');
  }
});

// =========================
// Plan Products
// =========================

// GET /api/plan/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const [rows] = await conn.promise().query(
      `
      SELECT 
        pp.plan_product_id,
        pp.plan_id,
        pp.product_id,
        pp.servings,
        p.name AS product_name,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fats_g
      FROM nutrition_plan_contains_products pp
      JOIN products p ON p.product_id = pp.product_id
      JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE pp.plan_id = ?
      ORDER BY pp.plan_product_id ASC
      `,
      [id]
    );
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err, 'Failed to list plan products');
  }
});

// POST /api/plan/:id/products   body: {product_id, servings?}
router.post('/:id/products', requireActiveUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const productId = Number(req.body?.product_id);
    if (!Number.isFinite(productId)) return bad(res, 'product_id is required');

    // Derive servings from the product's linked recipe. If unavailable, default to 1.
    const [svRows] = await conn.promise().query(
      `
      SELECT COALESCE(NULLIF(r.servings, 0), 1) AS servings
      FROM products p
      JOIN recipes r ON r.recipe_id = p.recipe_id
      WHERE p.product_id = ?
      LIMIT 1
      `,
      [productId]
    );
    const servings = Number(svRows?.[0]?.servings) || 1;
    if (!Number.isFinite(servings) || servings <= 0) return bad(res, 'Invalid servings');

    const [result] = await conn.promise().query(
      `
      INSERT INTO nutrition_plan_contains_products
      (plan_id, product_id, servings)
      VALUES (?, ?, ?)
      `,
      [id, productId, servings]
    );
    return ok(res, { success: true, plan_product_id: result.insertId });
  } catch (err) {
    return serverErr(res, err, 'Failed to add product to plan');
  }
});

// PATCH /api/plan/:id/products/:plan_product_id   body: {servings}
router.patch('/:id/products/:plan_product_id', requireActiveUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const linkId = Number(req.params.plan_product_id);
    if (!Number.isFinite(id) || !Number.isFinite(linkId)) return bad(res, 'Invalid id');

    const servings = Number(req.body?.servings);
    if (!Number.isFinite(servings) || servings <= 0) return bad(res, 'Invalid servings');

    const [result] = await conn.promise().query(
      `
      UPDATE nutrition_plan_contains_products
      SET servings = ?
      WHERE plan_product_id = ? AND plan_id = ?
      `,
      [servings, linkId, id]
    );
    if (result.affectedRows === 0) return notFound(res, 'Plan product link not found');

    return ok(res, { success: true, plan_product_id: linkId, servings });
  } catch (err) {
    return serverErr(res, err, 'Failed to update plan product');
  }
});

// DELETE /api/plan/:id/products/:plan_product_id
router.delete('/:id/products/:plan_product_id', requireActiveUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const linkId = Number(req.params.plan_product_id);
    if (!Number.isFinite(id) || !Number.isFinite(linkId)) return bad(res, 'Invalid id');

    const [result] = await conn.promise().query(
      `
      DELETE FROM nutrition_plan_contains_products
      WHERE plan_product_id = ? AND plan_id = ?
      `,
      [linkId, id]
    );
    if (result.affectedRows === 0) return notFound(res, 'Plan product link not found');

    return ok(res, { success: true, deleted: linkId });
  } catch (err) {
    return serverErr(res, err, 'Failed to delete plan product');
  }
});

// GET /api/plan/:id/allergies
router.get('/:id/allergies', requireActiveUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const [rows] = await conn.promise().query(
      `
      SELECT 
        ca.comp_id,
        c.name
      FROM customer_allergies ca
      JOIN components c ON c.comp_id = ca.comp_id
      WHERE ca.customer_id = ?
      ORDER BY c.name ASC
    `,
      [id]
    );
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err, 'Failed to list plan allergies');
  }
});

module.exports = router;