import { Request, Response } from 'express';
import { getQueueStats } from '../services/purchaseQueue';

// Get queue statistics (admin endpoint)
export async function getQueueStatistics(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getQueueStats();
    
    res.json({
      success: true,
      queueStats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get queue statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
