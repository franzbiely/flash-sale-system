import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0,
    validate: {
      validator: function(this: IProduct, value: number) {
        return !value || value <= this.price;
      },
      message: 'Sale price must be less than or equal to regular price'
    }
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  imageUrl: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL']
  }
}, {
  timestamps: true
});

// Index for searching by name and stock availability
productSchema.index({ name: 'text' });
productSchema.index({ stock: 1 });

export const Product = model<IProduct>('Product', productSchema);
