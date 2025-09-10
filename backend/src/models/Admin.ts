import { Schema, model, Document } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 60 // bcrypt hash length
  }
}, {
  timestamps: true
});

// Index for faster email lookups
adminSchema.index({ email: 1 });

export const Admin = model<IAdmin>('Admin', adminSchema);
