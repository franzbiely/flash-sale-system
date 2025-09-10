import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models/Product';
import { FlashSale } from '../models/FlashSale';
import { Customer } from '../models/Customer';
import { Purchase } from '../models/Purchase';
import { OTP } from '../models/OTP';
import { emailService } from '../services/emailService';

// Request purchase with OTP generation
export async function requestPurchase(req: Request, res: Response): Promise<void> {
  try {
    const { email, productId } = req.body;

    // Validate input
    if (!email || !productId) {
      res.status(400).json({ error: 'Email and product ID are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate product ID
    if (!Types.ObjectId.isValid(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Find active flash sale for this product
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      productId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      stock: { $gt: 0 }
    });

    if (!activeFlashSale) {
      res.status(400).json({ 
        error: 'No active flash sale found for this product or sale is out of stock' 
      });
      return;
    }

    // Check if user already has a pending purchase for this sale
    const existingPurchase = await Purchase.findOne({
      userEmail: email.toLowerCase(),
      saleId: activeFlashSale._id
    });

    if (existingPurchase) {
      res.status(409).json({ 
        error: 'You already have a purchase request for this flash sale' 
      });
      return;
    }

    // Create or update customer
    await Customer.findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase() },
      { upsert: true, new: true }
    );

    // Clean up any existing OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    const otp = new OTP({
      email: email.toLowerCase(),
      code: otpCode,
      expiresAt: otpExpiry
    });
    await otp.save();

    // Send OTP via email
    try {
      await emailService.sendOTP(email, otpCode, product.name);
    } catch (emailError) {
      // Clean up OTP if email fails
      await OTP.deleteOne({ _id: otp._id });
      res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        email: email.toLowerCase(),
        productId,
        productName: product.name,
        saleEndTime: activeFlashSale.endTime,
        otpExpiresAt: otpExpiry
      }
    });
  } catch (error) {
    console.error('Request purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Verify purchase with OTP validation
export async function verifyPurchase(req: Request, res: Response): Promise<void> {
  try {
    const { email, productId, otp } = req.body;

    // Validate input
    if (!email || !productId || !otp) {
      res.status(400).json({ error: 'Email, product ID, and OTP are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate product ID
    if (!Types.ObjectId.isValid(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: 'OTP must be 6 digits' });
      return;
    }

    // Find and validate OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      code: otp
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Find active flash sale for this product
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      productId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      stock: { $gt: 0 }
    });

    if (!activeFlashSale) {
      res.status(400).json({ 
        error: 'Flash sale is no longer active or out of stock' 
      });
      return;
    }

    // Check if user already has a purchase for this sale
    const existingPurchase = await Purchase.findOne({
      userEmail: email.toLowerCase(),
      saleId: activeFlashSale._id
    });

    if (existingPurchase) {
      res.status(409).json({ 
        error: 'You already have a purchase for this flash sale' 
      });
      return;
    }

    // Begin transaction-like operation
    try {
      // Reduce flash sale stock
      const updatedFlashSale = await FlashSale.findByIdAndUpdate(
        activeFlashSale._id,
        { $inc: { stock: -1 } },
        { new: true }
      );

      if (!updatedFlashSale || updatedFlashSale.stock < 0) {
        // Rollback if stock went negative
        await FlashSale.findByIdAndUpdate(
          activeFlashSale._id,
          { $inc: { stock: 1 } }
        );
        res.status(400).json({ error: 'Flash sale is out of stock' });
        return;
      }

      // Create purchase record
      const purchase = new Purchase({
        userEmail: email.toLowerCase(),
        productId,
        saleId: activeFlashSale._id,
        verified: true, // OTP verified, so purchase is verified
        timestamp: new Date()
      });

      const savedPurchase = await purchase.save();

      // Clean up used OTP
      await OTP.deleteOne({ _id: otpRecord._id });

      // Send purchase confirmation email (non-blocking)
      emailService.sendPurchaseConfirmation(
        email,
        product.name,
        savedPurchase._id.toString(),
        true
      ).catch(error => {
        console.error('Failed to send purchase confirmation:', error);
      });

      res.json({
        success: true,
        message: 'Purchase verified and queued for processing',
        purchase: {
          id: savedPurchase._id,
          productName: product.name,
          userEmail: savedPurchase.userEmail,
          verified: savedPurchase.verified,
          timestamp: savedPurchase.timestamp,
          saleEndTime: activeFlashSale.endTime,
          remainingStock: updatedFlashSale.stock
        }
      });
    } catch (purchaseError) {
      // Rollback flash sale stock if purchase creation fails
      await FlashSale.findByIdAndUpdate(
        activeFlashSale._id,
        { $inc: { stock: 1 } }
      );
      throw purchaseError;
    }
  } catch (error) {
    console.error('Verify purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get purchase status by email
export async function getPurchaseStatus(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.params;

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Get recent purchases for this email
    const purchases = await Purchase.find({ 
      userEmail: email.toLowerCase() 
    })
      .populate('productId', 'name price salePrice imageUrl')
      .populate('saleId', 'startTime endTime')
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Get any pending OTPs
    const pendingOTP = await OTP.findOne({
      email: email.toLowerCase(),
      expiresAt: { $gt: new Date() }
    });

    res.json({
      success: true,
      data: {
        email: email.toLowerCase(),
        recentPurchases: purchases,
        hasPendingOTP: !!pendingOTP,
        otpExpiresAt: pendingOTP?.expiresAt
      }
    });
  } catch (error) {
    console.error('Get purchase status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
