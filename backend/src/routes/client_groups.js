const router = require('express').Router();
const ctrl = require('../controllers/groupController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminOnly); // Only admins can manage groups of companies

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
