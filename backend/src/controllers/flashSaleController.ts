import { Request, Response } from 'express';
import { FlashSale } from '../models/FlashSale';
import { Product } from '../models/Product';
import { Types } from 'mongoose';

// Create a new flash sale
export async function createFlashSale(req: Request, res: Response): Promise<void> {
  try {
    const { productId, startTime, endTime, stock } = req.body;
    const adminId = req.admin?.adminId;

    // Validate required fields
    if (!productId || !startTime || !endTime || stock === undefined) {
      res.status(400).json({ 
        error: 'Product ID, start time, end time, and stock are required' 
      });
      return;
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    if (start >= end) {
      res.status(400).json({ error: 'Start time must be before end time' });
      return;
    }

    if (end <= now) {
      res.status(400).json({ error: 'End time must be in the future' });
      return;
    }

    // Validate stock
    if (stock < 0) {
      res.status(400).json({ error: 'Stock must be non-negative' });
      return;
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Check if product has enough stock
    if (stock > product.stock) {
      res.status(400).json({ 
        error: `Flash sale stock (${stock}) cannot exceed product stock (${product.stock})` 
      });
      return;
    }

    // Check for overlapping flash sales for the same product
    const overlappingFlashSale = await FlashSale.findOne({
      productId,
      $or: [
        { startTime: { $lte: start }, endTime: { $gte: start } },
        { startTime: { $lte: end }, endTime: { $gte: end } },
        { startTime: { $gte: start }, endTime: { $lte: end } }
      ]
    });

    if (overlappingFlashSale) {
      res.status(409).json({ 
        error: 'Product already has a flash sale during this time period' 
      });
      return;
    }

    const flashSale = new FlashSale({
      productId,
      startTime: start,
      endTime: end,
      stock,
      createdBy: adminId
    });

    const savedFlashSale = await flashSale.save();
    
    // Populate product details
    await savedFlashSale.populate('productId', 'name price salePrice imageUrl');
    await savedFlashSale.populate('createdBy', 'email');

    res.status(201).json({
      success: true,
      flashSale: savedFlashSale
    });
  } catch (error) {
    console.error('Create flash sale error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all flash sales with optional filtering
export async function getFlashSales(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '10', 
      status, 
      productId 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = {};
    const now = new Date();

    if (productId && Types.ObjectId.isValid(productId as string)) {
      query.productId = productId;
    }

    // Filter by status
    if (status) {
      switch (status) {
        case 'upcoming':
          query.startTime = { $gt: now };
          break;
        case 'active':
          query.startTime = { $lte: now };
          query.endTime = { $gte: now };
          break;
        case 'ended':
          query.endTime = { $lt: now };
          break;
      }
    }

    // Execute query with pagination
    const [flashSales, totalCount] = await Promise.all([
      FlashSale.find(query)
        .populate('productId', 'name price salePrice imageUrl')
        .populate('createdBy', 'email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FlashSale.countDocuments(query)
    ]);

    // Add status to each flash sale
    const flashSalesWithStatus = flashSales.map(sale => ({
      ...sale,
      status: getFlashSaleStatus(sale.startTime, sale.endTime)
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      flashSales: flashSalesWithStatus,
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
    console.error('Get flash sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update a flash sale by ID
export async function updateFlashSale(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { productId, startTime, endTime, stock } = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid flash sale ID' });
      return;
    }

    // Find existing flash sale
    const existingFlashSale = await FlashSale.findById(id);
    if (!existingFlashSale) {
      res.status(404).json({ error: 'Flash sale not found' });
      return;
    }

    // Check if flash sale has already ended
    const now = new Date();
    if (existingFlashSale.endTime < now) {
      res.status(400).json({ error: 'Cannot update a flash sale that has already ended' });
      return;
    }

    // Build update object
    const updateData: any = {};

    // Validate and update productId
    if (productId !== undefined) {
      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      updateData.productId = productId;
    }

    // Validate and update times
    if (startTime !== undefined || endTime !== undefined) {
      const newStartTime = startTime ? new Date(startTime) : existingFlashSale.startTime;
      const newEndTime = endTime ? new Date(endTime) : existingFlashSale.endTime;

      if ((startTime && isNaN(newStartTime.getTime())) || 
          (endTime && isNaN(newEndTime.getTime()))) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      if (newStartTime >= newEndTime) {
        res.status(400).json({ error: 'Start time must be before end time' });
        return;
      }

      if (newEndTime <= now) {
        res.status(400).json({ error: 'End time must be in the future' });
        return;
      }

      // Check for overlapping flash sales (excluding current one)
      const finalProductId = updateData.productId || existingFlashSale.productId;
      const overlappingFlashSale = await FlashSale.findOne({
        _id: { $ne: id },
        productId: finalProductId,
        $or: [
          { startTime: { $lte: newStartTime }, endTime: { $gte: newStartTime } },
          { startTime: { $lte: newEndTime }, endTime: { $gte: newEndTime } },
          { startTime: { $gte: newStartTime }, endTime: { $lte: newEndTime } }
        ]
      });

      if (overlappingFlashSale) {
        res.status(409).json({ 
          error: 'Product already has a flash sale during this time period' 
        });
        return;
      }

      if (startTime) updateData.startTime = newStartTime;
      if (endTime) updateData.endTime = newEndTime;
    }

    // Validate and update stock
    if (stock !== undefined) {
      if (stock < 0) {
        res.status(400).json({ error: 'Stock must be non-negative' });
        return;
      }

      const finalProductId = updateData.productId || existingFlashSale.productId;
      const product = await Product.findById(finalProductId);
      
      if (product && stock > product.stock) {
        res.status(400).json({ 
          error: `Flash sale stock (${stock}) cannot exceed product stock (${product.stock})` 
        });
        return;
      }

      updateData.stock = stock;
    }

    const updatedFlashSale = await FlashSale.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('productId', 'name price salePrice imageUrl')
     .populate('createdBy', 'email');

    res.json({
      success: true,
      flashSale: {
        ...updatedFlashSale?.toObject(),
        status: getFlashSaleStatus(updatedFlashSale!.startTime, updatedFlashSale!.endTime)
      }
    });
  } catch (error) {
    console.error('Update flash sale error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete a flash sale by ID
export async function deleteFlashSale(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid flash sale ID' });
      return;
    }

    const flashSale = await FlashSale.findById(id)
      .populate('productId', 'name price')
      .populate('createdBy', 'email');

    if (!flashSale) {
      res.status(404).json({ error: 'Flash sale not found' });
      return;
    }

    // Check if flash sale is currently active
    const now = new Date();
    const isActive = now >= flashSale.startTime && now <= flashSale.endTime;

    if (isActive) {
      res.status(400).json({ 
        error: 'Cannot delete an active flash sale. Wait for it to end or update the end time.' 
      });
      return;
    }

    await FlashSale.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Flash sale deleted successfully',
      flashSale
    });
  } catch (error) {
    console.error('Delete flash sale error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get a single flash sale by ID
export async function getFlashSaleById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid flash sale ID' });
      return;
    }

    const flashSale = await FlashSale.findById(id)
      .populate('productId', 'name price salePrice imageUrl stock')
      .populate('createdBy', 'email');

    if (!flashSale) {
      res.status(404).json({ error: 'Flash sale not found' });
      return;
    }

    res.json({
      success: true,
      flashSale: {
        ...flashSale.toObject(),
        status: getFlashSaleStatus(flashSale.startTime, flashSale.endTime)
      }
    });
  } catch (error) {
    console.error('Get flash sale by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to determine flash sale status
function getFlashSaleStatus(startTime: Date, endTime: Date): 'upcoming' | 'active' | 'ended' {
  const now = new Date();
  
  if (now < startTime) {
    return 'upcoming';
  } else if (now <= endTime) {
    return 'active';
  } else {
    return 'ended';
  }
}
