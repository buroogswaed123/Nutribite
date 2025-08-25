
//mounts the admin sub-routers. This keeps admin/auth mounted separately in app.js
// so we can keep login unauthenticated while still enforcing admin checks in the handler

const express = require('express');
const router = express.Router();

// Sub-routers (each file should export an Express router)
const usersRouter = require('./users');
const contentRouter = require('./content');
const moderationRouter = require('./moderation');
const systemRouter = require('./system');

//diagnostic endpoint for the admin namespace
router.get('/health', (req, res) => {
  res.json({ ok: true, scope: 'admin' });
});

//Mount domain sub-routers under /api/admin/*
router.use('/users', usersRouter);
router.use('/content', contentRouter);
router.use('/moderation', moderationRouter);
router.use('/system', systemRouter);


module.exports = router;