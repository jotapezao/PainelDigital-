const router = require('express').Router();
const { login, me, register, changePassword, getUser, listUsers, updateUser, deleteUser } = require('../controllers/authController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authMiddleware, me);
router.post('/register', authMiddleware, requireAdmin, register);
router.get('/users', authMiddleware, requireAdmin, listUsers);
router.get('/users/:id', authMiddleware, requireAdmin, getUser);
router.put('/users/:id', authMiddleware, requireAdmin, updateUser);
router.delete('/users/:id', authMiddleware, requireAdmin, deleteUser);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;
