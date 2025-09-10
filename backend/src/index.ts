import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { connectToDatabase } from './config/db';
import { testRedisConnection } from './config/redis';
import healthRouter from './routes/health';
import adminRouter from './routes/admin';
import flashSalesRouter from './routes/flashSales';
import purchaseRouter from './routes/purchase';

async function startServer(): Promise<void> {
  const app: Application = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/health', healthRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/flash-sales', flashSalesRouter);
  app.use('/api', purchaseRouter);

  try {
    // Connect to MongoDB
    await connectToDatabase(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test Redis connection
    const redisOk = await testRedisConnection();
    if (!redisOk) {
      console.warn('Redis connection failed - queue functionality will be limited');
    }

    const port = env.PORT;
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on http://localhost:${port}`);
      console.log('Purchase queue worker is running');
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();


