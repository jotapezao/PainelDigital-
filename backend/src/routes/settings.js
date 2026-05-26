const router = require('express').Router();
const { getSettings, updateSettings, uploadLogo, generateBackup } = require('../controllers/settingsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getSettings);
router.put('/', authMiddleware, requireAdmin, updateSettings);
router.post('/logo', authMiddleware, requireAdmin, upload.single('file'), uploadLogo);
router.get('/backup', authMiddleware, requireAdmin, generateBackup);

module.exports = router;
