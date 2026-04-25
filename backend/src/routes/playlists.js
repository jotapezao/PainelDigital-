const router = require('express').Router();
const ctrl = require('../controllers/playlistController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', ctrl.list);
router.get('/active', ctrl.getActive);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/items', ctrl.setItems);
router.delete('/:id', ctrl.remove);

module.exports = router;
