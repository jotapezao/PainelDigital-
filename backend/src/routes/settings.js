const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.get('/', getSettings);
router.put('/', authMiddleware, requireAdmin, updateSettings);

module.exports = router;
