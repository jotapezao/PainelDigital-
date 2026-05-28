const router = require('express').Router();
const ctrl = require('../controllers/mediaController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authMiddleware);

// Rotas do Sistema de Pastas (V3.2)
router.get('/folders', ctrl.listFolders);
router.post('/folders', ctrl.createFolder);
router.put('/folders/:id', ctrl.updateFolder);
router.delete('/folders/:id', ctrl.removeFolder);

router.get('/', ctrl.list);
router.post('/upload', upload.single('file'), ctrl.upload);
router.post('/widget', ctrl.createWidget);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
