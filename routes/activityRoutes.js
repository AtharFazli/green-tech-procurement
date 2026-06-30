const router = require('express').Router();
const ActivityLogController = require('../controllers/ActivityLogController');
const auth = require('../middleware/auth');

router.get('/', auth, ActivityLogController.getRecent);

module.exports = router;
