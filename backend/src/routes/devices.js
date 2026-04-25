const router = require('express').Router();
const ctrl = require('../controllers/deviceController');
const { authMiddleware } = require('../middleware/auth');

// Public pairing endpoint (TV uses this)
router.get('/pair/:code', ctrl.pairDevice);

router.use(authMiddleware);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/sync', ctrl.syncDevice);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/playlist', ctrl.assignPlaylist);
router.post('/heartbeat', ctrl.heartbeat);
router.delete('/:id', ctrl.remove);

module.exports = router;
