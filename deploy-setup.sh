#!/bin/bash

# Production Deployment Setup Script
# This script sets up the environment variables for production deployment

echo "🚀 Setting up Photos application for production deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Paystack Configuration (Production Keys)
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here

# Google Drive Configuration
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DRIVE_ACCESS_TOKEN=your_access_token
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token

# Application Settings
NODE_ENV=production
PORT=5000
EOF
    echo "✅ .env file created successfully"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Set up database
echo "🗄️  Setting up database..."
npm run db:push

echo "🎉 Setup complete! Your application is ready for deployment."
echo ""
echo "📋 Next steps:"
echo "1. Deploy to your hosting platform (Railway, Vercel, Heroku, etc.)"
echo "2. Set the same environment variables in your hosting platform"
echo "3. The application will automatically handle caching and token management"
echo ""
echo "🔧 Available commands:"
echo "- npm run dev (development)"
echo "- npm start (production)"
echo "- npm run build (build for production)"
