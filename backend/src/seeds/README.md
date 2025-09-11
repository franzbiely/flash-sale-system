# Database Seeds

This directory contains scripts to populate the database with initial data for development and testing.

## Available Seeds

### 1. Create Admin User Only
```bash
npm run seed:admin
```

Creates a single admin user with the following credentials:
- **Email**: admin@example.com
- **Password**: admin123

### 2. Seed Complete Database
```bash
npm run seed:all
```

Creates:
- Admin user (admin@example.com / admin123)
- 6 sample products with images
- 5 sample flash sales (active, upcoming, and ended)

## Usage

1. Make sure your database is running (MongoDB)
2. Make sure your environment variables are set (`.env` file)
3. Run the appropriate seed command from the backend directory

```bash
cd backend
npm run seed:all
```

## Sample Data Created

### Products
- Wireless Bluetooth Headphones ($199.99 → $149.99)
- Smart Watch Pro ($299.99 → $239.99)
- Laptop Stand Aluminum ($79.99 → $59.99)
- USB-C Hub 7-in-1 ($49.99 → $34.99)
- Mechanical Keyboard RGB ($129.99 → $99.99)
- Wireless Mouse Gaming ($69.99)

### Flash Sales
- **Active Sales**: 2 sales currently running
- **Upcoming Sales**: 2 sales starting soon
- **Ended Sales**: 1 completed sale

## Notes

- Scripts are idempotent - running them multiple times won't create duplicates
- All products include sample images from Unsplash
- Flash sale times are relative to when the script runs
- Admin user password is hashed using bcrypt with 12 salt rounds
