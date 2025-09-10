import { Router } from 'express';
import { getMongoStatus } from '../config/db';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongo: getMongoStatus(),
  });
});

export default router;


