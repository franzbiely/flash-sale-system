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

      // Process purchase with business logic
      const processingResult = await processPurchaseLogic(purchase, product, flashSale);

      // Send appropriate confirmation email based on result
      if (processingResult.success) {
        await emailService.sendPurchaseConfirmation(
          email,
          product.name,
          purchaseId,
          true
        );
      } else {
        // Send different email for failed purchases
        await sendFailureNotification(email, product.name, processingResult.message, processingResult.soldOut);
      }

      console.log(`Purchase job ${job.id} completed: ${processingResult.message}`);
      
      return {
        success: processingResult.success,
        purchaseId,
        processedAt: new Date().toISOString(),
        message: processingResult.message,
        soldOut: processingResult.soldOut
      };
    } catch (error) {
      console.error(`Purchase job ${job.id} failed:`, error);
      
      // Update purchase record on failure if it's the final attempt
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await Purchase.findByIdAndUpdate(purchaseId, {
          verified: false,
          $set: {
            'metadata.reason': 'job_failed_final',
            'metadata.error': error instanceof Error ? error.message : 'Unknown error',
            'metadata.processedAt': new Date(),
            'metadata.finalAttempt': true
          }
        });
        
        // Send failure notification on final attempt
        try {
          const product = await Product.findById(productId);
          if (product) {
            await sendFailureNotification(email, product.name, 'Processing failed after multiple attempts', false);
          }
        } catch (emailError) {
          console.error('Failed to send failure notification:', emailError);
        }
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
): Promise<{ success: boolean; message: string; soldOut?: boolean }> {
  const { userEmail, productId, saleId } = purchase;
  
  console.log(`Processing purchase for ${product.name} by ${userEmail}`);
  
  try {
    // Step 1: Check if customer already has a verified purchase for this product
    const existingPurchase = await Purchase.findOne({
      userEmail,
      productId,
      verified: true,
      _id: { $ne: purchase._id } // Exclude current purchase
    });

    if (existingPurchase) {
      console.log(`Customer ${userEmail} already has a purchase for product ${productId}`);
      
      // Mark current purchase as unverified (duplicate)
      await Purchase.findByIdAndUpdate(purchase._id, {
        verified: false,
        $set: { 
          'metadata.reason': 'duplicate_purchase',
          'metadata.existingPurchaseId': existingPurchase._id,
          'metadata.processedAt': new Date()
        }
      });

      return {
        success: false,
        message: 'Customer already purchased this product'
      };
    }

    // Step 2: Atomically decrement product stock with condition
    const updatedProduct = await Product.findOneAndUpdate(
      { 
        _id: productId,
        stock: { $gt: 0 } // Only update if stock > 0
      },
      { 
        $inc: { stock: -1 }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updatedProduct) {
      console.log(`Product ${productId} is sold out - stock insufficient`);
      
      // Mark purchase as failed due to sold out
      await Purchase.findByIdAndUpdate(purchase._id, {
        verified: false,
        $set: {
          'metadata.reason': 'sold_out',
          'metadata.processedAt': new Date()
        }
      });

      return {
        success: false,
        message: 'Product is sold out',
        soldOut: true
      };
    }

    // Step 3: Record successful purchase processing
    await Purchase.findByIdAndUpdate(purchase._id, {
      verified: true,
      $set: {
        'metadata.reason': 'processed_successfully',
        'metadata.processedAt': new Date(),
        'metadata.finalProductStock': updatedProduct.stock
      }
    });

    console.log(`Purchase processed successfully for ${userEmail}. Remaining stock: ${updatedProduct.stock}`);
    
    // Step 4: Additional business logic (payment, fulfillment, etc.)
    await performAdditionalProcessing(purchase, product, flashSale, updatedProduct);

    return {
      success: true,
      message: 'Purchase processed successfully'
    };

  } catch (error) {
    console.error(`Error processing purchase ${purchase._id}:`, error);
    
    // Mark purchase as failed with error
    await Purchase.findByIdAndUpdate(purchase._id, {
      verified: false,
      $set: {
        'metadata.reason': 'processing_error',
        'metadata.error': error instanceof Error ? error.message : 'Unknown error',
        'metadata.processedAt': new Date()
      }
    });

    throw error;
  }
}

// Additional processing logic (placeholder for business operations)
async function performAdditionalProcessing(
  purchase: any,
  product: any,
  flashSale: any,
  updatedProduct: any
): Promise<void> {
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Here you would implement additional business logic:
    // - Payment processing (Stripe, PayPal, etc.)
    // - Generate order numbers
    // - Update CRM systems
    // - Send to fulfillment center
    // - Update analytics
    // - Send webhooks to external systems
    
    console.log(`Additional processing completed for purchase ${purchase._id}`);
    
    // Example: Log to external order system
    /*
    await externalOrderSystem.createOrder({
      purchaseId: purchase._id,
      customerId: purchase.userEmail,
      productId: product._id,
      productName: product.name,
      price: product.salePrice || product.price,
      quantity: 1,
      timestamp: purchase.timestamp
    });
    */
    
  } catch (error) {
    console.error(`Additional processing failed for purchase ${purchase._id}:`, error);
    // Don't throw here - main purchase is already recorded successfully
  }
}

// Send failure notification email
async function sendFailureNotification(
  email: string,
  productName: string,
  reason: string,
  soldOut: boolean = false
): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@flashsale.com',
      to: email,
      subject: `Purchase Update - ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Purchase Update</h2>
          
          <p>Hello,</p>
          
          <p>We have an update regarding your purchase request for <strong>${productName}</strong>.</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin: 0; color: #721c24;">${soldOut ? 'Product Sold Out' : 'Purchase Processing Issue'}</h3>
            <p style="margin: 10px 0 0 0; color: #721c24;">${reason}</p>
          </div>
          
          ${soldOut ? `
            <p>Unfortunately, this product sold out while your purchase was being processed. This can happen during high-demand flash sales.</p>
            <p>We apologize for any inconvenience. Please check our other available flash sales!</p>
          ` : `
            <p>We encountered an issue processing your purchase. Our team has been notified and will investigate.</p>
            <p>If you have any questions, please contact our support team.</p>
          `}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from Flash Sale System. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Purchase Update - ${productName}
        
        We have an update regarding your purchase request for ${productName}.
        
        ${soldOut ? 'Product Sold Out' : 'Purchase Processing Issue'}: ${reason}
        
        ${soldOut ? 
          'Unfortunately, this product sold out while your purchase was being processed. This can happen during high-demand flash sales. We apologize for any inconvenience.' :
          'We encountered an issue processing your purchase. Our team has been notified and will investigate.'
        }
      `
    };

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: (process.env.EMAIL_PORT || '587') === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail(mailOptions);
    console.log(`Failure notification sent to ${email} for ${productName}`);
  } catch (error) {
    console.error('Failed to send failure notification:', error);
  }
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
