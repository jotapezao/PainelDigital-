const router = require('express').Router();
const { getSettings, updateSettings, uploadLogo } = require('../controllers/settingsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getSettings);
router.put('/', authMiddleware, requireAdmin, updateSettings);
router.post('/logo', authMiddleware, requireAdmin, upload.single('file'), uploadLogo);

module.exports = router;
