const router = require('express').Router();
const ctrl = require('../controllers/mediaController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authMiddleware);
router.get('/', ctrl.list);
router.post('/upload', upload.single('file'), ctrl.upload);
router.post('/widget', ctrl.createWidget);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
