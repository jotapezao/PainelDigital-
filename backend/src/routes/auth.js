const router = require('express').Router();
const { login, me, register, changePassword } = require('../controllers/authController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authMiddleware, me);
router.post('/register', authMiddleware, requireAdmin, register);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;
