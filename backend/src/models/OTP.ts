import { Schema, model, Document } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOTP>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  code: {
    type: String,
    required: true,
    length: 6,
    match: [/^\d{6}$/, 'OTP code must be 6 digits']
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  }
}, {
  timestamps: true
});

// Index for email lookups and automatic cleanup of expired OTPs
otpSchema.index({ email: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual to check if OTP is expired
otpSchema.virtual('isExpired').get(function(this: IOTP) {
  return new Date() > this.expiresAt;
});

// Static method to generate 6-digit OTP
otpSchema.statics.generateCode = function(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const OTP = model<IOTP>('OTP', otpSchema);
