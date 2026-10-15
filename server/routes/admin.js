const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const audit = require('../utils/audit');
const {
  getUsers,
  toggleUserStatus,
  getAllCounselors,
  addCounselor,
  updateCounselor,
  deleteCounselor,
  getAllAppointments,
  getAnalytics,
  getReportedPosts,
  deleteForumPost,
} = require('../controllers/adminController');

// Every administrator action is written to the audit log.
const auditAdmin = (req, res, next) => {
  res.on('finish', () => {
    audit(req, `admin.${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`, {
      outcome: res.statusCode < 400 ? 'success' : 'failure',
    });
  });
  next();
};

router.use(protect, requireRole('admin'), auditAdmin);

router.get('/users', getUsers);
router.put('/users/:id/status', toggleUserStatus);
router.get('/counselors', getAllCounselors);
router.post('/counselors', addCounselor);
router.put('/counselors/:id', updateCounselor);
router.delete('/counselors/:id', deleteCounselor);
router.get('/appointments', getAllAppointments);
router.get('/analytics', getAnalytics);
router.get('/forum/reported', getReportedPosts);
router.delete('/forum/:id', deleteForumPost);

module.exports = router;
