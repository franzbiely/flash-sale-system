import { Schema, model, Document } from 'mongoose';

export interface ICustomer extends Document {
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: true
});

// Index for faster email lookups
customerSchema.index({ email: 1 });

export const Customer = model<ICustomer>('Customer', customerSchema);
