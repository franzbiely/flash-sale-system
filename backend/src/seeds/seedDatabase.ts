import mongoose from 'mongoose';
import { Admin } from '../models/Admin';
import { Product } from '../models/Product';
import { FlashSale } from '../models/FlashSale';
import { hashPassword } from '../utils/password';
import { connectToDatabase } from '../config/db';
import { env } from '../config/env';

async function seedDatabase() {
  try {
    // Connect to database
    await connectToDatabase(env.MONGODB_URI);
    console.log('Connected to database');

    // Create Admin User
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    let adminId;
    
    if (!existingAdmin) {
      const passwordHash = await hashPassword('admin123');
      const admin = new Admin({
        email: 'admin@example.com',
        passwordHash
      });
      await admin.save();
      adminId = admin._id;
      console.log('✅ Admin user created!');
    } else {
      adminId = existingAdmin._id;
      console.log('ℹ️  Admin user already exists');
    }

    // Create Sample Products
    const products = [
      {
        name: 'Wireless Bluetooth Headphones',
        price: 199.99,
        salePrice: 149.99,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'
      },
      {
        name: 'Smart Watch Pro',
        price: 299.99,
        salePrice: 239.99,
        stock: 30,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
      },
      {
        name: 'Laptop Stand Aluminum',
        price: 79.99,
        salePrice: 59.99,
        stock: 100,
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop'
      },
      {
        name: 'USB-C Hub 7-in-1',
        price: 49.99,
        salePrice: 34.99,
        stock: 75,
        imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&h=500&fit=crop'
      },
      {
        name: 'Mechanical Keyboard RGB',
        price: 129.99,
        salePrice: 99.99,
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&h=500&fit=crop'
      },
      {
        name: 'Wireless Mouse Gaming',
        price: 69.99,
        stock: 60,
        imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop'
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const existingProduct = await Product.findOne({ name: productData.name });
      if (!existingProduct) {
        const product = new Product(productData);
        await product.save();
        createdProducts.push(product);
        console.log(`✅ Created product: ${product.name}`);
      } else {
        createdProducts.push(existingProduct);
        console.log(`ℹ️  Product already exists: ${existingProduct.name}`);
      }
    }

    // Create Sample Flash Sales
    const now = new Date();
    const flashSales = [
      {
        productId: createdProducts[0]._id,
        startTime: new Date(now.getTime() - 1000 * 60 * 60), // Started 1 hour ago
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 2), // Ends in 2 hours
        stock: 10,
        createdBy: adminId
      },
      {
        productId: createdProducts[1]._id,
        startTime: new Date(now.getTime() - 1000 * 60 * 30), // Started 30 minutes ago
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 6), // Ends in 6 hours
        stock: 5,
        createdBy: adminId
      },
      {
        productId: createdProducts[2]._id,
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 2), // Starts in 2 hours
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 8), // Ends in 8 hours
        stock: 20,
        createdBy: adminId
      },
      {
        productId: createdProducts[3]._id,
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24), // Starts in 1 day
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 26), // Ends in 26 hours
        stock: 15,
        createdBy: adminId
      },
      {
        productId: createdProducts[4]._id,
        startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24), // Started 1 day ago
        endTime: new Date(now.getTime() - 1000 * 60 * 60 * 2), // Ended 2 hours ago
        stock: 0,
        createdBy: adminId
      }
    ];

    for (const flashSaleData of flashSales) {
      const existingFlashSale = await FlashSale.findOne({ 
        productId: flashSaleData.productId,
        startTime: flashSaleData.startTime 
      });
      
      if (!existingFlashSale) {
        const flashSale = new FlashSale(flashSaleData);
        await flashSale.save();
        console.log(`✅ Created flash sale for product: ${createdProducts.find(p => p._id.equals(flashSaleData.productId))?.name}`);
      } else {
        console.log(`ℹ️  Flash sale already exists for this product and time`);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@example.com / admin123');
    console.log(`- Products: ${createdProducts.length} products created`);
    console.log('- Flash Sales: Multiple sales (active, upcoming, ended) created');
    console.log('\n🚀 You can now use the application with sample data!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

// Run the script
seedDatabase();
