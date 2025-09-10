import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
  }

  async sendOTP(email: string, otp: string, productName: string): Promise<void> {
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Flash Sale Purchase Verification - OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Flash Sale Purchase Verification</h2>
          
          <p>Hello,</p>
          
          <p>You've requested to purchase <strong>${productName}</strong> in our flash sale.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #007bff;">Your Verification Code</h3>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; color: #007bff;">${otp}</p>
          </div>
          
          <p><strong>Important:</strong></p>
          <ul>
            <li>This code will expire in <strong>10 minutes</strong></li>
            <li>Use this code to complete your purchase verification</li>
            <li>Do not share this code with anyone</li>
          </ul>
          
          <p>If you didn't request this code, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from Flash Sale System. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Flash Sale Purchase Verification
        
        You've requested to purchase ${productName} in our flash sale.
        
        Your verification code: ${otp}
        
        This code will expire in 10 minutes.
        Use this code to complete your purchase verification.
        Do not share this code with anyone.
        
        If you didn't request this code, please ignore this email.
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`OTP email sent successfully to ${email}`);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPurchaseConfirmation(
    email: string, 
    productName: string, 
    purchaseId: string,
    verified: boolean
  ): Promise<void> {
    const status = verified ? 'Confirmed' : 'Pending Verification';
    const statusColor = verified ? '#28a745' : '#ffc107';
    
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: `Purchase ${status} - ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Purchase ${status}</h2>
          
          <p>Hello,</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: ${statusColor};">Purchase Details</h3>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Purchase ID:</strong> ${purchaseId}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor};">${status}</span></p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          ${verified 
            ? '<p style="color: #28a745;"><strong>Congratulations!</strong> Your purchase has been confirmed and will be processed shortly.</p>'
            : '<p style="color: #ffc107;"><strong>Note:</strong> Your purchase is pending verification and will be processed once confirmed.</p>'
          }
          
          <p>Thank you for your purchase!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from Flash Sale System. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Purchase ${status}
        
        Product: ${productName}
        Purchase ID: ${purchaseId}
        Status: ${status}
        Date: ${new Date().toLocaleDateString()}
        
        ${verified 
          ? 'Congratulations! Your purchase has been confirmed and will be processed shortly.'
          : 'Note: Your purchase is pending verification and will be processed once confirmed.'
        }
        
        Thank you for your purchase!
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Purchase confirmation email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send purchase confirmation email:', error);
      // Don't throw here as purchase should still succeed even if email fails
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
