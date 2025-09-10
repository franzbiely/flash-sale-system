import { Redis } from 'ioredis';
import { env } from './env';

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailure: 1000,
  lazyConnect: true,
});

redisConnection.on('connect', () => {
  console.log('Redis connected successfully');
});

redisConnection.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redisConnection.on('close', () => {
  console.log('Redis connection closed');
});

export async function testRedisConnection(): Promise<boolean> {
  try {
    await redisConnection.ping();
    console.log('Redis connection test successful');
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}
