import { Router } from 'express';
import { loginAdmin } from '../controllers/authController';
import { authenticateAdmin } from '../middleware/auth';
import { 
  createProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct, 
  getProductById 
} from '../controllers/productController';

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

// Product management routes (all protected)
router.post('/products', authenticateAdmin, createProduct);
router.get('/products', authenticateAdmin, getProducts);
router.get('/products/:id', authenticateAdmin, getProductById);
router.put('/products/:id', authenticateAdmin, updateProduct);
router.delete('/products/:id', authenticateAdmin, deleteProduct);

export default router;
