import { Router } from 'express';
import {
  getActiveFlashSales,
  getUpcomingFlashSales,
  getEndedFlashSales,
  getFlashSaleSummary
} from '../controllers/publicFlashSaleController';

const router = Router();

// Public flash sale routes (no authentication required)
router.get('/active', getActiveFlashSales);
router.get('/upcoming', getUpcomingFlashSales);
router.get('/ended', getEndedFlashSales);
router.get('/summary', getFlashSaleSummary);

export default router;
