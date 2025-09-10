import { Router } from 'express';
import { loginAdmin } from '../controllers/authController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', loginAdmin);

// Protected routes (require authentication)
router.get('/profile', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

export default router;
