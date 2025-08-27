const express = require("express");
const router = express.Router();
const db = require("../dbSingleton");

// Helpers
const getConn = () => {
  const conn = db.getConnection && db.getConnection();
  if (!conn) throw new Error('DB connection not initialized');
  return conn;
};
const sendError = (res, err, code = 500) => {
  console.error(err);
  res.status(code).json({ message: err.message || 'Server error' });
};
const requireFields = (res, body, fields) => {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
    return false;
  }
  return true;
};

//get all
router.get("/", (req, res) => {
  try {
    const conn = getConn();
    conn.query("SELECT * FROM customers", (err, results) => err ? sendError(res, err) : res.json(results));
  } catch (e) { sendError(res, e); }
});

// Get a single customer by cust_id
router.get('/:cust_id', (req, res) => {
  try {
    const conn = getConn();
    const sql = "SELECT c.*, DATE_FORMAT(c.birthdate, '%Y-%m-%d') AS birthdate FROM customers c WHERE c.cust_id = ? LIMIT 1";
    conn.query(sql, [req.params.cust_id], (err, rows) => {
      if (err) return sendError(res, err);
      if (!rows || rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
      return res.json(rows[0]);
    });
  } catch (e) { sendError(res, e); }
});

// (moved '/:cust_id' below address route to avoid shadowing)

// Get address by customer id
router.get('/:cust_id/address', (req, res) => {
  try {
    const conn = getConn();
    const sql = `
      SELECT a.*
      FROM customers c
      LEFT JOIN address a ON a.address_id = c.address_id
      WHERE c.cust_id = ?
      LIMIT 1
    `;
    conn.query(sql, [req.params.cust_id], (err, rows) => {
      if (err) return sendError(res, err);
      if (!rows || rows.length === 0 || !rows[0] || rows[0].address_id == null) {
        return res.status(404).json({ message: 'Address not found' });
      }
      return res.json(rows[0]);
    });
  } catch (e) { sendError(res, e); }
});

// Get a customer by user_id (used by FE to retrieve cust_id and name)
router.get("/by-user/:user_id", (req, res) => {
  try {
    const conn = getConn();
    conn.query(
      "SELECT c.*, DATE_FORMAT(c.birthdate, '%Y-%m-%d') AS birthdate FROM customers c WHERE user_id = ? LIMIT 1",
      [req.params.user_id],
      (err, rows) => {
        if (err) return sendError(res, err);
        if (!rows || rows.length === 0) return res.status(404).json({ message: "Customer not found" });
        return res.json(rows[0]);
      }
    );
  } catch (e) { sendError(res, e); }
});

// Delete a customer
router.delete("/:cust_id", (req, res) => {
  try {
    const conn = getConn();
    conn.query("DELETE FROM customers WHERE cust_id = ?", [req.params.cust_id], (err, results) => {
      if (err) return sendError(res, err);
      if (results.affectedRows === 0) return res.status(404).json({ message: "Customer not found!" });
      res.json({ message: "Customer deleted successfully" });
    });
  } catch (e) { sendError(res, e); }
});

// Add a customer: given a user_id, verify users.user_type === 'customer' then insert into customers
router.post("/", async (req, res) => {
  try {
    if (!requireFields(res, req.body, ["user_id"])) return;
    const { user_id } = req.body;
    const conn = getConn();

    // 1) Check the user exists and is of type 'customer'
    conn.query("SELECT user_id, user_type FROM users WHERE user_id = ? LIMIT 1", [user_id], (err, rows) => {
      if (err) return sendError(res, err);
      if (!rows || rows.length === 0) return res.status(404).json({ message: "User not found" });

      const user = rows[0];
      if (user.user_type !== 'customer') {
        return res.status(400).json({ message: "User is not a customer" });
      }

      // 2) Atomic upsert to avoid race duplicates. Requires UNIQUE KEY on customers.user_id
      // Trick: set cust_id = LAST_INSERT_ID(cust_id) so result.insertId returns the existing cust_id on duplicate
      const sql = `
        INSERT INTO customers (user_id)
        VALUES (?)
        ON DUPLICATE KEY UPDATE cust_id = LAST_INSERT_ID(cust_id)
      `;
      conn.query(sql, [user_id], (err2, result) => {
        if (err2) return sendError(res, err2);
        const custId = result && result.insertId ? result.insertId : null;
        if (!custId) return sendError(res, new Error('Failed to resolve cust_id after upsert'));
        const created = (result.affectedRows === 1); // insert occurred
        return res.status(created ? 201 : 200).json({ message: created ? 'Customer added' : 'Customer already exists', cust_id: custId });
      });
    });
  } catch (e) {
    sendError(res, e);
  }
});

// Update customer details (partial: name, address, phone, subscription)
// Also supports updating address table fields: city, street, house_num, floor, city_code
router.put('/:cust_id', (req, res) => {
  const { cust_id } = req.params;
  // Accept paypal_email and also alias 'paypal' from FE
  const { name, phone_number, phone, subscription, paypal_email, paypal } = req.body;
  const { birthdate } = req.body;
  const { city, street, house_Num, floor, city_code } = req.body;

  // Build dynamic SET only for provided customer fields
  const setClauses = [];
  const params = [];
  if (typeof name !== 'undefined') { setClauses.push('name = ?'); params.push(name); }
  if (typeof phone_number !== 'undefined') { setClauses.push('phone_number = ?'); params.push(phone_number); }
  // Alias support: accept 'phone' key and map to phone_number if phone_number not provided
  if (typeof phone !== 'undefined' && typeof phone_number === 'undefined') { setClauses.push('phone_number = ?'); params.push(phone); }
  if (typeof subscription !== 'undefined') { setClauses.push('subscription = ?'); params.push(subscription); }
  if (typeof paypal_email !== 'undefined') { setClauses.push('paypal_email = ?'); params.push(paypal_email); }
  // Alias support: 'paypal' key maps to paypal_email
  if (typeof paypal !== 'undefined' && typeof paypal_email === 'undefined') { setClauses.push('paypal_email = ?'); params.push(paypal); }
  if (typeof birthdate !== 'undefined') { setClauses.push('birthdate = ?'); params.push(birthdate); }

  // Address fields presence check
  const addressUpdates = {};
  if (typeof city !== 'undefined') addressUpdates.city = city;
  if (typeof street !== 'undefined') addressUpdates.street = street;
  if (typeof house_Num !== 'undefined') addressUpdates.house_Num = house_Num;
  if (typeof floor !== 'undefined') addressUpdates.floor = floor;
  if (typeof city_code !== 'undefined') addressUpdates.city_code = city_code;
  const hasAddressFields = Object.keys(addressUpdates).length > 0;

  if (setClauses.length === 0 && !hasAddressFields) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    const conn = getConn();

    // Helper to finish response after both updates considered
    const done = (customerErr, customerResult) => {
      if (customerErr) return sendError(res, customerErr);
      if (setClauses.length > 0 && customerResult && customerResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      if (!hasAddressFields) {
        return res.json({ message: 'Customer updated successfully' });
      }

      // Build dynamic address update
      const addrSet = [];
      const addrParams = [];
      Object.entries(addressUpdates).forEach(([k, v]) => { addrSet.push(`${k} = ?`); addrParams.push(v); });

      // First fetch existing address_id for this customer
      conn.query('SELECT address_id FROM customers WHERE cust_id = ? LIMIT 1', [cust_id], (fkErr, fkRows) => {
        if (fkErr) return sendError(res, fkErr);
        const addressId = fkRows && fkRows[0] ? fkRows[0].address_id : null;
        if (addressId) {
          // Update existing address row
          const updateSql = `UPDATE address SET ${addrSet.join(', ')} WHERE address_id = ?`;
          conn.query(updateSql, [...addrParams, addressId], (addrErr, addrRes) => {
            if (addrErr) return sendError(res, addrErr);
            return res.json({ message: 'Customer and address updated successfully' });
          });
        } else {
          // Insert new address, then set customers.address_id
          const cols = Object.keys(addressUpdates);
          const placeholders = cols.map(() => '?').join(', ');
          const insertSql = `INSERT INTO address (${cols.join(', ')}) VALUES (${placeholders})`;
          const insertParams = Object.values(addressUpdates);
          conn.query(insertSql, insertParams, (insErr, insRes) => {
            if (insErr) return sendError(res, insErr);
            const newAddrId = insRes.insertId;
            conn.query('UPDATE customers SET address_id = ? WHERE cust_id = ?', [newAddrId, cust_id], (linkErr) => {
              if (linkErr) return sendError(res, linkErr);
              return res.json({ message: 'Customer updated; address created and linked successfully' });
            });
          });
        }
      });
    };

    if (setClauses.length > 0) {
      const sql = `UPDATE customers SET ${setClauses.join(', ')} WHERE cust_id = ?`;
      params.push(cust_id);
      conn.query(sql, params, (err, result) => done(err, result));
    } else {
      // No customer fields to update; proceed directly to address handling
      done(null, { affectedRows: 1 });
    }
  } catch (e) { sendError(res, e); }
});

module.exports = router;