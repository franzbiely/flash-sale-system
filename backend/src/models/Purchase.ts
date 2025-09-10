import { Schema, model, Document, Types } from 'mongoose';

export interface IPurchase extends Document {
  userEmail: string;
  productId: Types.ObjectId;
  saleId: Types.ObjectId;
  verified: boolean;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>({
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  saleId: {
    type: Schema.Types.ObjectId,
    ref: 'FlashSale',
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
purchaseSchema.index({ userEmail: 1, timestamp: -1 });
purchaseSchema.index({ saleId: 1, verified: 1 });
purchaseSchema.index({ productId: 1, timestamp: -1 });

// Prevent duplicate purchases for same user/sale combination
purchaseSchema.index({ userEmail: 1, saleId: 1 }, { unique: true });

export const Purchase = model<IPurchase>('Purchase', purchaseSchema);
