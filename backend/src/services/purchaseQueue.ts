import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { Purchase } from '../models/Purchase';
import { Product } from '../models/Product';
import { FlashSale } from '../models/FlashSale';
import { emailService } from './emailService';

// Job payload interface
export interface PurchaseJobData {
  email: string;
  productId: string;
  saleId: string;
  purchaseId: string;
  timestamp: string;
}

// Create purchase queue
export const purchaseQueue = new Queue('purchase-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,         // Start with 2 second delay
    },
  },
});

// Purchase job processor
const purchaseWorker = new Worker(
  'purchase-processing',
  async (job: Job<PurchaseJobData>) => {
    const { email, productId, saleId, purchaseId, timestamp } = job.data;
    
    console.log(`Processing purchase job ${job.id} for ${email}`);
    
    try {
      // Verify purchase still exists and is valid
      const purchase = await Purchase.findById(purchaseId);
      if (!purchase) {
        throw new Error(`Purchase ${purchaseId} not found`);
      }

      if (!purchase.verified) {
        throw new Error(`Purchase ${purchaseId} is not verified`);
      }

      // Get product and flash sale details
      const [product, flashSale] = await Promise.all([
        Product.findById(productId),
        FlashSale.findById(saleId)
      ]);

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      if (!flashSale) {
        throw new Error(`Flash sale ${saleId} not found`);
      }

      // Simulate purchase processing (replace with actual business logic)
      await processPurchaseLogic(purchase, product, flashSale);

      // Send processing confirmation email
      await emailService.sendPurchaseConfirmation(
        email,
        product.name,
        purchaseId,
        true
      );

      console.log(`Purchase job ${job.id} completed successfully`);
      
      return {
        success: true,
        purchaseId,
        processedAt: new Date().toISOString(),
        message: 'Purchase processed successfully'
      };
    } catch (error) {
      console.error(`Purchase job ${job.id} failed:`, error);
      
      // Update purchase record on failure if it's the final attempt
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await Purchase.findByIdAndUpdate(purchaseId, {
          verified: false,
          // Add failure metadata if needed
        });
      }
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Purchase processing business logic
async function processPurchaseLogic(
  purchase: any,
  product: any,
  flashSale: any
): Promise<void> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Here you would implement your actual purchase processing logic:
  // - Payment processing
  // - Inventory management
  // - Order fulfillment
  // - Shipping arrangements
  // - Third-party integrations
  
  console.log(`Processing purchase for ${product.name} by ${purchase.userEmail}`);
  
  // Example: Update product stock if needed
  // await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 } });
  
  // Example: Log to external systems
  // await externalOrderSystem.createOrder({...});
  
  console.log(`Purchase processing completed for ${purchase._id}`);
}

// Queue event handlers
purchaseQueue.on('completed', (job: Job, result: any) => {
  console.log(`Purchase job ${job.id} completed:`, result);
});

purchaseQueue.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`Purchase job ${job?.id} failed:`, error.message);
});

purchaseQueue.on('stalled', (jobId: string) => {
  console.warn(`Purchase job ${jobId} stalled`);
});

// Worker event handlers
purchaseWorker.on('completed', (job: Job, result: any) => {
  console.log(`Worker completed job ${job.id}:`, result);
});

purchaseWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`Worker failed job ${job?.id}:`, error.message);
});

purchaseWorker.on('error', (error: Error) => {
  console.error('Purchase worker error:', error);
});

// Add purchase to queue
export async function enqueuePurchase(jobData: PurchaseJobData): Promise<Job<PurchaseJobData>> {
  try {
    const job = await purchaseQueue.add(
      'process-purchase',
      jobData,
      {
        // Job-specific options
        priority: 10, // Higher priority for purchases
        delay: 0,     // Process immediately
      }
    );
    
    console.log(`Purchase job ${job.id} enqueued for ${jobData.email}`);
    return job;
  } catch (error) {
    console.error('Failed to enqueue purchase:', error);
    throw error;
  }
}

// Get queue statistics
export async function getQueueStats() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      purchaseQueue.getWaiting(),
      purchaseQueue.getActive(),
      purchaseQueue.getCompleted(),
      purchaseQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0
    };
  }
}

// Graceful shutdown
export async function shutdownQueue(): Promise<void> {
  try {
    console.log('Shutting down purchase queue...');
    await purchaseWorker.close();
    await purchaseQueue.close();
    console.log('Purchase queue shutdown complete');
  } catch (error) {
    console.error('Error during queue shutdown:', error);
  }
}
