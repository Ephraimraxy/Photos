#!/bin/bash

# Production Deployment Setup Script
# This script sets up the environment variables for production deployment

echo "🚀 Setting up Photos application for production deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
export DATABASE_URL=your-database-url

# Paystack Configuration (Production Keys)
export PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
export PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key

# Google Drive Configuration
export GOOGLE_DRIVE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
export GOOGLE_DRIVE_CLIENT_SECRET=your-google-client-secret
export GOOGLE_DRIVE_ACCESS_TOKEN=your-google-access-token
export GOOGLE_DRIVE_REFRESH_TOKEN=your-google-refresh-token
export GOOGLE_DRIVE_API_KEY=your-google-api-key

# Application Settings
export NODE_ENV=production
export PORT=5000
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
