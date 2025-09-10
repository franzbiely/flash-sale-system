import { Request, Response } from 'express';
import { FlashSale } from '../models/FlashSale';

// Get currently active flash sales
export async function getActiveFlashSales(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '20',
      sortBy = 'endTime',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();

    // Build query for active flash sales
    const query = {
      startTime: { $lte: now },
      endTime: { $gte: now },
      stock: { $gt: 0 } // Only show sales with available stock
    };

    // Build sort object
    const sort: any = {};
    const validSortFields = ['endTime', 'startTime', 'stock'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'endTime';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [flashSales, totalCount] = await Promise.all([
      FlashSale.find(query)
        .populate('productId', 'name price salePrice imageUrl')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FlashSale.countDocuments(query)
    ]);

    // Add time remaining and status for each sale
    const flashSalesWithStatus = flashSales.map(sale => {
      const timeRemaining = sale.endTime.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
      const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

      return {
        ...sale,
        status: 'active',
        timeRemaining: {
          hours: hoursRemaining,
          minutes: minutesRemaining,
          totalMilliseconds: Math.max(0, timeRemaining)
        },
        stockPercentage: sale.stock > 0 ? Math.round((sale.stock / sale.stock) * 100) : 0
      };
    });

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
    console.error('Get active flash sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get upcoming flash sales
export async function getUpcomingFlashSales(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '20',
      sortBy = 'startTime',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();

    // Build query for upcoming flash sales
    const query = {
      startTime: { $gt: now }
    };

    // Build sort object
    const sort: any = {};
    const validSortFields = ['startTime', 'endTime', 'stock'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'startTime';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [flashSales, totalCount] = await Promise.all([
      FlashSale.find(query)
        .populate('productId', 'name price salePrice imageUrl')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FlashSale.countDocuments(query)
    ]);

    // Add time until start for each sale
    const flashSalesWithStatus = flashSales.map(sale => {
      const timeUntilStart = sale.startTime.getTime() - now.getTime();
      const daysUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
      const hoursUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...sale,
        status: 'upcoming',
        timeUntilStart: {
          days: Math.max(0, daysUntilStart),
          hours: Math.max(0, hoursUntilStart),
          minutes: Math.max(0, minutesUntilStart),
          totalMilliseconds: Math.max(0, timeUntilStart)
        }
      };
    });

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
    console.error('Get upcoming flash sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get ended flash sales
export async function getEndedFlashSales(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '20',
      sortBy = 'endTime',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();

    // Build query for ended flash sales
    const query = {
      endTime: { $lt: now }
    };

    // Build sort object
    const sort: any = {};
    const validSortFields = ['endTime', 'startTime', 'stock'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'endTime';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [flashSales, totalCount] = await Promise.all([
      FlashSale.find(query)
        .populate('productId', 'name price salePrice imageUrl')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FlashSale.countDocuments(query)
    ]);

    // Add duration and status for each sale
    const flashSalesWithStatus = flashSales.map(sale => {
      const duration = sale.endTime.getTime() - sale.startTime.getTime();
      const durationHours = Math.floor(duration / (1000 * 60 * 60));
      const durationMinutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

      const timeSinceEnd = now.getTime() - sale.endTime.getTime();
      const daysSinceEnd = Math.floor(timeSinceEnd / (1000 * 60 * 60 * 24));
      const hoursSinceEnd = Math.floor((timeSinceEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return {
        ...sale,
        status: 'ended',
        duration: {
          hours: durationHours,
          minutes: durationMinutes,
          totalMilliseconds: duration
        },
        timeSinceEnd: {
          days: daysSinceEnd,
          hours: hoursSinceEnd,
          totalMilliseconds: timeSinceEnd
        }
      };
    });

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
    console.error('Get ended flash sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get flash sale summary/stats for homepage
export async function getFlashSaleSummary(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();

    // Get counts for each status
    const [activeCount, upcomingCount, endedCount] = await Promise.all([
      FlashSale.countDocuments({
        startTime: { $lte: now },
        endTime: { $gte: now },
        stock: { $gt: 0 }
      }),
      FlashSale.countDocuments({
        startTime: { $gt: now }
      }),
      FlashSale.countDocuments({
        endTime: { $lt: now }
      })
    ]);

    // Get next upcoming sale
    const nextUpcoming = await FlashSale.findOne({
      startTime: { $gt: now }
    })
      .populate('productId', 'name price salePrice imageUrl')
      .sort({ startTime: 1 })
      .lean();

    // Get currently active sales (limit to 5 for summary)
    const activeSales = await FlashSale.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
      stock: { $gt: 0 }
    })
      .populate('productId', 'name price salePrice imageUrl')
      .sort({ endTime: 1 })
      .limit(5)
      .lean();

    // Add time remaining to active sales
    const activeSalesWithTime = activeSales.map(sale => {
      const timeRemaining = sale.endTime.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
      const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

      return {
        ...sale,
        status: 'active',
        timeRemaining: {
          hours: hoursRemaining,
          minutes: minutesRemaining,
          totalMilliseconds: Math.max(0, timeRemaining)
        }
      };
    });

    // Add time until start to next upcoming
    let nextUpcomingWithTime = null;
    if (nextUpcoming) {
      const timeUntilStart = nextUpcoming.startTime.getTime() - now.getTime();
      const daysUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
      const hoursUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

      nextUpcomingWithTime = {
        ...nextUpcoming,
        status: 'upcoming',
        timeUntilStart: {
          days: Math.max(0, daysUntilStart),
          hours: Math.max(0, hoursUntilStart),
          minutes: Math.max(0, minutesUntilStart),
          totalMilliseconds: Math.max(0, timeUntilStart)
        }
      };
    }

    res.json({
      success: true,
      summary: {
        counts: {
          active: activeCount,
          upcoming: upcomingCount,
          ended: endedCount
        },
        activeSales: activeSalesWithTime,
        nextUpcoming: nextUpcomingWithTime
      }
    });
  } catch (error) {
    console.error('Get flash sale summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
