import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Types } from 'mongoose';

// Create a new product
export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { name, price, salePrice, stock, imageUrl } = req.body;

    // Validate required fields
    if (!name || price === undefined || stock === undefined) {
      res.status(400).json({ 
        error: 'Name, price, and stock are required fields' 
      });
      return;
    }

    // Validate price values
    if (price < 0) {
      res.status(400).json({ error: 'Price must be non-negative' });
      return;
    }

    if (salePrice !== undefined && (salePrice < 0 || salePrice > price)) {
      res.status(400).json({ 
        error: 'Sale price must be non-negative and less than or equal to regular price' 
      });
      return;
    }

    // Validate stock
    if (stock < 0) {
      res.status(400).json({ error: 'Stock must be non-negative' });
      return;
    }

    const product = new Product({
      name: name.trim(),
      price,
      salePrice,
      stock,
      imageUrl: imageUrl?.trim()
    });

    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      product: savedProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all products with optional pagination and filtering
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search, 
      inStock 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = {};
    
    if (search) {
      query.$text = { $search: search as string };
    }
    
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Execute query with pagination
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update a product by ID
export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, price, salePrice, stock, imageUrl } = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (price !== undefined) {
      if (price < 0) {
        res.status(400).json({ error: 'Price must be non-negative' });
        return;
      }
      updateData.price = price;
    }
    
    if (salePrice !== undefined) {
      if (salePrice < 0) {
        res.status(400).json({ error: 'Sale price must be non-negative' });
        return;
      }
      updateData.salePrice = salePrice;
    }
    
    if (stock !== undefined) {
      if (stock < 0) {
        res.status(400).json({ error: 'Stock must be non-negative' });
        return;
      }
      updateData.stock = stock;
    }
    
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl?.trim() || undefined;
    }

    // Check if sale price is valid relative to price
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const finalPrice = updateData.price ?? existingProduct.price;
    const finalSalePrice = updateData.salePrice ?? existingProduct.salePrice;

    if (finalSalePrice && finalSalePrice > finalPrice) {
      res.status(400).json({ 
        error: 'Sale price must be less than or equal to regular price' 
      });
      return;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete a product by ID
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      product: deletedProduct
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get a single product by ID
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
