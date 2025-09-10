import mongoose from 'mongoose';

export async function connectToDatabase(mongoUri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
}

export function getMongoStatus(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}


