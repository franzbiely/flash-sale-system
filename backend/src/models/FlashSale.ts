import { Schema, model, Document, Types } from 'mongoose';

export interface IFlashSale extends Document {
  productId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  stock: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const flashSaleSchema = new Schema<IFlashSale>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: IFlashSale, value: Date) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for active flash sales
flashSaleSchema.index({ startTime: 1, endTime: 1 });
flashSaleSchema.index({ productId: 1, startTime: 1 });

// Virtual to check if flash sale is currently active
flashSaleSchema.virtual('isActive').get(function(this: IFlashSale) {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
});

export const FlashSale = model<IFlashSale>('FlashSale', flashSaleSchema);
