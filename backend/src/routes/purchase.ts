import { Router } from 'express';
import {
  requestPurchase,
  verifyPurchase,
  getPurchaseStatus
} from '../controllers/purchaseFlowController';

const router = Router();

// Public purchase flow routes (no authentication required)
router.post('/request-purchase', requestPurchase);
router.post('/verify-purchase', verifyPurchase);
router.get('/purchase-status/:email', getPurchaseStatus);

export default router;
