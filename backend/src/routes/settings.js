const router = require('express').Router();
const { getSettings, updateSettings, uploadLogo, generateBackup, importBackup } = require('../controllers/settingsController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const multer = require('multer');

const jsonUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.get('/', getSettings);
router.put('/', authMiddleware, requireAdmin, updateSettings);
router.post('/logo', authMiddleware, requireAdmin, upload.single('file'), uploadLogo);
router.get('/backup', authMiddleware, requireAdmin, generateBackup);
router.post('/import', authMiddleware, requireAdmin, jsonUpload.single('file'), importBackup);

module.exports = router;
