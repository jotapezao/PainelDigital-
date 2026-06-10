const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', ctrl.getUptimeReport);

module.exports = router;
