import { Request, Response } from 'express';
import { Purchase } from '../models/Purchase';
import { Customer } from '../models/Customer';
import { Types } from 'mongoose';

// Get all purchases with filtering and pagination
export async function getAllPurchases(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '10',
      verified,
      productId,
      saleId,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = {};

    if (verified !== undefined) {
      query.verified = verified === 'true';
    }

    if (productId && Types.ObjectId.isValid(productId as string)) {
      query.productId = productId;
    }

    if (saleId && Types.ObjectId.isValid(saleId as string)) {
      query.saleId = saleId;
    }

    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (!isNaN(start.getTime())) {
          query.timestamp.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (!isNaN(end.getTime())) {
          query.timestamp.$lte = end;
        }
      }
    }

    // Build sort object
    const sort: any = {};
    const validSortFields = ['timestamp', 'verified', 'userEmail'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'timestamp';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [purchases, totalCount] = await Promise.all([
      Purchase.find(query)
        .populate('productId', 'name price salePrice imageUrl')
        .populate('saleId', 'startTime endTime stock')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Purchase.countDocuments(query)
    ]);

    // Get summary statistics
    const stats = await Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          verifiedPurchases: { $sum: { $cond: ['$verified', 1, 0] } },
          unverifiedPurchases: { $sum: { $cond: ['$verified', 0, 1] } },
          uniqueCustomers: { $addToSet: '$userEmail' }
        }
      },
      {
        $project: {
          _id: 0,
          totalPurchases: 1,
          verifiedPurchases: 1,
          unverifiedPurchases: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    const summary = stats[0] || {
      totalPurchases: 0,
      verifiedPurchases: 0,
      unverifiedPurchases: 0,
      uniqueCustomers: 0
    };

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      purchases,
      summary,
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
    console.error('Get all purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get purchases by customer ID or email
export async function getPurchasesByCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { customerId } = req.params;
    const { 
      page = '1', 
      limit = '10',
      verified,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    let customerEmail: string;

    // Check if customerId is an ObjectId (customer ID) or email
    if (Types.ObjectId.isValid(customerId)) {
      // Find customer by ID
      const customer = await Customer.findById(customerId);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      customerEmail = customer.email;
    } else {
      // Treat as email
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(customerId)) {
        res.status(400).json({ error: 'Invalid customer ID or email format' });
        return;
      }
      customerEmail = customerId.toLowerCase();

      // Verify customer exists
      const customer = await Customer.findOne({ email: customerEmail });
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = { userEmail: customerEmail };

    if (verified !== undefined) {
      query.verified = verified === 'true';
    }

    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (!isNaN(start.getTime())) {
          query.timestamp.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (!isNaN(end.getTime())) {
          query.timestamp.$lte = end;
        }
      }
    }

    // Build sort object
    const sort: any = {};
    const validSortFields = ['timestamp', 'verified'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'timestamp';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [purchases, totalCount] = await Promise.all([
      Purchase.find(query)
        .populate('productId', 'name price salePrice imageUrl')
        .populate('saleId', 'startTime endTime stock')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Purchase.countDocuments(query)
    ]);

    // Get customer purchase statistics
    const stats = await Purchase.aggregate([
      { $match: { userEmail: customerEmail } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          verifiedPurchases: { $sum: { $cond: ['$verified', 1, 0] } },
          unverifiedPurchases: { $sum: { $cond: ['$verified', 0, 1] } },
          firstPurchase: { $min: '$timestamp' },
          lastPurchase: { $max: '$timestamp' }
        }
      }
    ]);

    const customerStats = stats[0] || {
      totalPurchases: 0,
      verifiedPurchases: 0,
      unverifiedPurchases: 0,
      firstPurchase: null,
      lastPurchase: null
    };

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      customerEmail,
      purchases,
      customerStats,
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
    console.error('Get purchases by customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update purchase verification status
export async function updatePurchaseVerification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid purchase ID' });
      return;
    }

    if (typeof verified !== 'boolean') {
      res.status(400).json({ error: 'Verified status must be a boolean' });
      return;
    }

    const purchase = await Purchase.findByIdAndUpdate(
      id,
      { verified },
      { new: true }
    ).populate('productId', 'name price salePrice')
     .populate('saleId', 'startTime endTime');

    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    res.json({
      success: true,
      purchase
    });
  } catch (error) {
    console.error('Update purchase verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get purchase analytics/dashboard data
export async function getPurchaseAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { days = '30' } = req.query;
    const daysNum = Math.max(1, Math.min(365, parseInt(days as string)));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Overall statistics
    const [totalStats, recentStats, topProducts, dailyStats] = await Promise.all([
      // Total statistics
      Purchase.aggregate([
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: 1 },
            verifiedPurchases: { $sum: { $cond: ['$verified', 1, 0] } },
            uniqueCustomers: { $addToSet: '$userEmail' }
          }
        },
        {
          $project: {
            _id: 0,
            totalPurchases: 1,
            verifiedPurchases: 1,
            verificationRate: {
              $cond: [
                { $eq: ['$totalPurchases', 0] },
                0,
                { $multiply: [{ $divide: ['$verifiedPurchases', '$totalPurchases'] }, 100] }
              ]
            },
            uniqueCustomers: { $size: '$uniqueCustomers' }
          }
        }
      ]),

      // Recent period statistics
      Purchase.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            recentPurchases: { $sum: 1 },
            recentVerified: { $sum: { $cond: ['$verified', 1, 0] } },
            recentCustomers: { $addToSet: '$userEmail' }
          }
        },
        {
          $project: {
            _id: 0,
            recentPurchases: 1,
            recentVerified: 1,
            recentCustomers: { $size: '$recentCustomers' }
          }
        }
      ]),

      // Top products by purchase count
      Purchase.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$productId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            productName: '$product.name',
            purchaseCount: '$count'
          }
        }
      ]),

      // Daily purchase counts for the period
      Purchase.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            totalPurchases: { $sum: 1 },
            verifiedPurchases: { $sum: { $cond: ['$verified', 1, 0] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        period: `${daysNum} days`,
        overall: totalStats[0] || { totalPurchases: 0, verifiedPurchases: 0, verificationRate: 0, uniqueCustomers: 0 },
        recent: recentStats[0] || { recentPurchases: 0, recentVerified: 0, recentCustomers: 0 },
        topProducts,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get purchase analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
