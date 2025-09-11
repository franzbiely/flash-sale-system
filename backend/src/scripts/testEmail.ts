import { emailService } from '../services/emailService';
import { connectToDatabase } from '../config/db';
import { env } from '../config/env';

async function testEmailService() {
  console.log('🧪 Testing Gmail SMTP Configuration...\n');

  // Display current configuration (without sensitive data)
  console.log('📧 Email Configuration:');
  console.log(`Host: ${env.EMAIL_HOST}`);
  console.log(`Port: ${env.EMAIL_PORT}`);
  console.log(`User: ${env.EMAIL_USER}`);
  console.log(`From: ${env.EMAIL_FROM}`);
  console.log(`Password: ${'*'.repeat(env.EMAIL_PASS.length)} (${env.EMAIL_PASS.length} characters)\n`);

  try {
    // Test connection first
    console.log('🔗 Testing SMTP connection...');
    const connectionOk = await emailService.testConnection();
    
    if (!connectionOk) {
      console.error('❌ SMTP connection failed!');
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check your EMAIL_USER is a valid Gmail address');
      console.log('2. Verify your EMAIL_PASS is a valid App Password (16 characters)');
      console.log('3. Ensure 2-Factor Authentication is enabled on your Gmail account');
      console.log('4. Check your internet connection');
      process.exit(1);
    }

    console.log('✅ SMTP connection successful!\n');

    // Get test email address
    const testEmail = process.argv[2] || env.EMAIL_USER;
    
    if (!testEmail || !testEmail.includes('@')) {
      console.error('❌ Please provide a valid test email address');
      console.log('Usage: npm run test-email your-test-email@gmail.com');
      process.exit(1);
    }

    console.log(`📨 Sending test OTP email to: ${testEmail}`);
    
    // Send test OTP email
    await emailService.sendOTP(testEmail, '123456', 'Test Product');
    console.log('✅ OTP email sent successfully!\n');

    console.log(`📨 Sending test purchase confirmation to: ${testEmail}`);
    
    // Send test confirmation email
    await emailService.sendPurchaseConfirmation(
      testEmail, 
      'Test Product', 
      'TEST-PURCHASE-123', 
      true
    );
    console.log('✅ Purchase confirmation email sent successfully!\n');

    console.log('🎉 All email tests passed!');
    console.log('Your Gmail SMTP configuration is working correctly.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.log('\n🔧 Common issues and solutions:');
    console.log('1. Invalid App Password - Generate a new one from Gmail settings');
    console.log('2. 2FA not enabled - Enable 2-Factor Authentication first');
    console.log('3. Wrong email address - Check EMAIL_USER in your .env file');
    console.log('4. Gmail security - Make sure App Passwords are enabled');
    console.log('5. Network issues - Check your internet connection');
  } finally {
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the test
testEmailService();
