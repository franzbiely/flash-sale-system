import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { Purchase } from '../models/Purchase';
import { Types } from 'mongoose';

// Get all customers with optional pagination and filtering
export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort: any = {};
    const validSortFields = ['createdAt', 'email', 'name'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [customers, totalCount] = await Promise.all([
      Customer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Customer.countDocuments(query)
    ]);

    // Get purchase counts for each customer
    const customerIds = customers.map(c => c._id);
    const purchaseCounts = await Purchase.aggregate([
      { $match: { userEmail: { $in: customers.map(c => c.email) } } },
      { $group: { _id: '$userEmail', count: { $sum: 1 } } }
    ]);

    // Map purchase counts to customers
    const purchaseCountMap = purchaseCounts.reduce((acc, pc) => {
      acc[pc._id] = pc.count;
      return acc;
    }, {} as Record<string, number>);

    const customersWithCounts = customers.map(customer => ({
      ...customer,
      purchaseCount: purchaseCountMap[customer.email] || 0
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      customers: customersWithCounts,
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
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get customer details with purchase history
export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { 
      purchasePage = '1', 
      purchaseLimit = '10' 
    } = req.query;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid customer ID' });
      return;
    }

    // Find customer
    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Pagination for purchases
    const pageNum = Math.max(1, parseInt(purchasePage as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(purchaseLimit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Get customer's purchases with product and flash sale details
    const [purchases, totalPurchases] = await Promise.all([
      Purchase.find({ userEmail: customer.email })
        .populate('productId', 'name price salePrice imageUrl')
        .populate('saleId', 'startTime endTime')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Purchase.countDocuments({ userEmail: customer.email })
    ]);

    // Calculate purchase statistics
    const purchaseStats = await Purchase.aggregate([
      { $match: { userEmail: customer.email } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          verifiedPurchases: {
            $sum: { $cond: ['$verified', 1, 0] }
          },
          firstPurchase: { $min: '$timestamp' },
          lastPurchase: { $max: '$timestamp' }
        }
      }
    ]);

    const stats = purchaseStats[0] || {
      totalPurchases: 0,
      verifiedPurchases: 0,
      firstPurchase: null,
      lastPurchase: null
    };

    const totalPurchasePages = Math.ceil(totalPurchases / limitNum);

    res.json({
      success: true,
      customer: {
        ...customer.toObject(),
        purchaseStats: stats,
        purchases,
        purchasePagination: {
          currentPage: pageNum,
          totalPages: totalPurchasePages,
          totalItems: totalPurchases,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPurchasePages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update customer information
export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { email, name } = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid customer ID' });
      return;
    }

    // Find existing customer
    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Build update object
    const updateData: any = {};

    if (email !== undefined) {
      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email is required and must be a string' });
        return;
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Check if email is already taken by another customer
      if (email !== existingCustomer.email) {
        const emailExists = await Customer.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: id }
        });
        
        if (emailExists) {
          res.status(409).json({ error: 'Email already exists' });
          return;
        }

        updateData.email = email.toLowerCase();

        // Update purchases with new email
        await Purchase.updateMany(
          { userEmail: existingCustomer.email },
          { userEmail: email.toLowerCase() }
        );
      }
    }

    if (name !== undefined) {
      if (name && typeof name !== 'string') {
        res.status(400).json({ error: 'Name must be a string' });
        return;
      }
      updateData.name = name?.trim() || undefined;
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete customer and their purchase history
export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid customer ID' });
      return;
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check if customer has any verified purchases
    const verifiedPurchases = await Purchase.countDocuments({
      userEmail: customer.email,
      verified: true
    });

    if (verifiedPurchases > 0) {
      res.status(400).json({ 
        error: 'Cannot delete customer with verified purchases. Consider anonymizing instead.' 
      });
      return;
    }

    // Delete customer's unverified purchases first
    await Purchase.deleteMany({ userEmail: customer.email });

    // Delete customer
    await Customer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Customer and associated data deleted successfully',
      customer
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
