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

// Top-level helper: add days to a date/ISO string and return YYYY-MM-DD
function addDays(dateOrIso, days) {
  const d = new Date(dateOrIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
    // If a customer_id was provided, optionally enqueue a 'plan' notification if the latest plan ended
    try {
      if (customer_id && rows && rows.length > 0) {
        const latest = rows[0];
        const endIso = latest.end_date && latest.end_date.toISOString ? latest.end_date.toISOString().slice(0,10) : String(latest.end_date || '');
        const todayIso = new Date().toISOString().slice(0,10);
        if (endIso && endIso <= todayIso) {
          // find user_id for this customer
          const [[custRow]] = await conn.promise().query('SELECT user_id FROM customers WHERE cust_id = ? LIMIT 1', [Number(customer_id)]);
          const userId = custRow && custRow.user_id;
          if (userId) {
            const [notifRows] = await conn.promise().query(
              'SELECT notification_id FROM notifications WHERE user_id = ? AND type = ? AND related_id = ? LIMIT 1',
              [userId, 'plan', latest.plan_id]
            );
            if (!notifRows || notifRows.length === 0) {
              await conn.promise().query(
                'INSERT INTO notifications (user_id, type, related_id, title, description) VALUES (?, ?, ?, ?, ?)',
                [userId, 'plan', latest.plan_id, 'התוכנית הסתיימה', 'התוכנית השבועית הסתיימה. תרצה לחדש?']
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed creating plan renewal notification (non-fatal):', e?.message || e);
    }

    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err, 'Failed to list plans');
  }
});

// POST /api/plan/:id/replace_products
// Body: { items: Array<{ product_id: number, servings?: number }> }
// Overwrites nutrition_plan_contains_products with exactly the provided list
router.post('/:id/replace_products', requireActiveUser, async (req, res) => {
  const tx = conn.promise();
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    try {
      console.debug('[plan.replace_products] plan_id=', id, 'incoming items=', items);
    } catch {}
    await tx.query('DELETE FROM nutrition_plan_contains_products WHERE plan_id = ?', [id]);
    if (items.length === 0) return ok(res, { success: true, plan_id: id, replaced: 0 });

    const values = [];
    for (const it of items) {
      const pid = Number(it.product_id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const servings = Math.max(1, Number(it.servings || 1));
      values.push([id, pid, servings]);
    }
    if (values.length) {
      await tx.query(
        'INSERT INTO nutrition_plan_contains_products (plan_id, product_id, servings) VALUES ?'
        , [values]
      );
    }
    try {
      console.debug('[plan.replace_products] plan_id=', id, 'inserted rows count=', values.length, 'product_ids=', values.map(v=>v[1]));
    } catch {}
    return ok(res, { success: true, plan_id: id, replaced: values.length });
  } catch (err) {
    return serverErr(res, err, 'Failed to replace plan products');
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
        r.fats_g,
        r.picture,
        r.category_id,
        c.name AS category_name
      FROM nutrition_plan_contains_products pp
      JOIN products p ON p.product_id = pp.product_id
      JOIN recipes r ON r.recipe_id = p.recipe_id
      LEFT JOIN categories c ON c.category_id = r.category_id
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
    // Default end_date to start_date + 7 days when not provided
    const endDate = data.end_date ?? addDays(startDate, 7);

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

// POST /api/plan/:id/renew
router.post('/:id/renew', requireActiveUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const endDate = addDays(todayIso, 7);

    const [result] = await conn.promise().query(
      `UPDATE nutritionplan SET start_date = ?, end_date = ? WHERE plan_id = ?`,
      [todayIso, endDate, id]
    );
    if (result.affectedRows === 0) return notFound(res, 'Plan not found');

    return ok(res, { success: true, plan_id: id });
  } catch (err) {
    return serverErr(res, err, 'Failed to renew plan');
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
        r.fats_g,
        r.picture,
        r.category_id,
        c.name AS category_name
      FROM nutrition_plan_contains_products pp
      JOIN products p ON p.product_id = pp.product_id
      JOIN recipes r ON r.recipe_id = p.recipe_id
      LEFT JOIN categories c ON c.category_id = r.category_id
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

// POST /api/plan/:id/add_to_cart
// Copy exact saved plan items (nutrition_plan_contains_products) into cart_items for the logged-in user.
// Body options: { clear?: boolean (default true), quantityMode?: 'one' | 'servings' }
router.post('/:id/add_to_cart', requireActiveUser, async (req, res) => {
  const tx = conn.promise();
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'Invalid id');

    const userId = req.session && req.session.user_id ? Number(req.session.user_id) : null;
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Not logged in' });

    const clear = req.body && typeof req.body.clear !== 'undefined' ? !!req.body.clear : true;
    const quantityMode = (req.body?.quantityMode === 'servings') ? 'servings' : 'one';

    // Load exact saved plan items
    const [items] = await tx.query(
      `
      SELECT pp.product_id, COALESCE(pp.servings, 1) AS servings
      FROM nutrition_plan_contains_products pp
      WHERE pp.plan_id = ?
      ORDER BY pp.plan_product_id ASC
      `,
      [id]
    );
    try {
      console.debug('[plan.add_to_cart] plan_id=', id, 'loaded plan items=', items);
    } catch {}

    if (!items || items.length === 0) {
      return ok(res, { added: 0 });
    }

    if (clear) {
      await tx.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    }

    // For each saved item: determine qty and cap by stock
    let added = 0;
    for (const it of items) {
      const pid = Number(it.product_id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const qtyRaw = quantityMode === 'servings' ? Number(it.servings || 1) : 1;
      const qty = Math.max(1, qtyRaw);
      // Fetch current stock and price
      const [pRows] = await tx.query('SELECT price, stock FROM products WHERE product_id = ? LIMIT 1', [pid]);
      const price = Number(pRows?.[0]?.price || 0);
      const stock = Math.max(0, Number(pRows?.[0]?.stock || 0));
      const finalQty = Math.min(qty, stock || qty);
      if (finalQty <= 0) continue;

      // Upsert by user+product: set/replace exact quantity
      const [existRows] = await tx.query('SELECT id FROM cart_items WHERE user_id = ? AND product_id = ? LIMIT 1', [userId, pid]);
      if (existRows && existRows[0]) {
        await tx.query('UPDATE cart_items SET quantity = ?, price = ? WHERE id = ?', [finalQty, price, existRows[0].id]);
      } else {
        await tx.query('INSERT INTO cart_items (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [userId, pid, finalQty, price]);
      }
      added += 1;
    }

    return ok(res, { added });
  } catch (err) {
    return serverErr(res, err, 'Failed to add plan items to cart');
  }
});

module.exports = router;