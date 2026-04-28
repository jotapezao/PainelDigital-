const router = require('express').Router();
const ctrl = require('../controllers/clientController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', ctrl.list);
router.get('/:id/users', requireAdmin, ctrl.getUsers);
router.get('/:id', ctrl.getById);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
