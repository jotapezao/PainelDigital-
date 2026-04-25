const router = require('express').Router();
const ctrl = require('../controllers/logController');
const { authMiddleware } = require('../middleware/auth');

router.get('/stats', authMiddleware, ctrl.stats);
router.get('/', authMiddleware, ctrl.list);
router.post('/', ctrl.create); // TV posts logs (with device JWT or open)

module.exports = router;
