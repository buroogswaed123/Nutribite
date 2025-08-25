//mounts the admin sub-routers. This keeps admin/auth mounted separately in app.js
// so we can keep login unauthenticated while still enforcing admin checks in the handler

const express = require('express');
const router = express.Router();

// Sub-routers 
const usersRouter = require('./users');
const menuRouter = require('./menu');
const ordersRouter = require('./orders');
const dataRouter = require('./data');
const recipesRouter = require('./recipes');

//diagnostic endpoint for the admin namespace
router.get('/health', (req, res) => {
  res.json({ ok: true, scope: 'admin' });
});

//Mount domain sub-routers under /api/admin/*
router.use('/users', usersRouter);
router.use('/menu', menuRouter);
router.use('/orders', ordersRouter);
router.use('/data', dataRouter);
router.use('/recipes', recipesRouter);


module.exports = router;