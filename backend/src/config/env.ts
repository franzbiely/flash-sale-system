import dotenv from 'dotenv';

dotenv.config();

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production',
  PORT: parsePort(process.env.PORT, 4000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/flash-sale',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
} as const;


