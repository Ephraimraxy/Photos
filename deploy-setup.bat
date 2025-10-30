@echo off
echo 🚀 Setting up Photos application for production deployment...

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file...
    
    (
        echo # Database Configuration
        echo DATABASE_URL=your-database-url
        echo.
        echo # Paystack Configuration ^(Production Keys^)
        echo PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
        echo PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
        echo.
        echo # Google Drive Configuration
        echo GOOGLE_DRIVE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
        echo GOOGLE_DRIVE_CLIENT_SECRET=your-google-client-secret
        echo GOOGLE_DRIVE_ACCESS_TOKEN=your-google-access-token
        echo GOOGLE_DRIVE_REFRESH_TOKEN=your-google-refresh-token
        echo GOOGLE_DRIVE_API_KEY=your-google-api-key
        echo.
        echo # Application Settings
        echo NODE_ENV=production
        echo PORT=5000
    ) > .env
    echo ✅ .env file created successfully
) else (
    echo ⚠️  .env file already exists, skipping creation
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Build the application
echo 🔨 Building application...
npm run build

REM Set up database
echo 🗄️  Setting up database...
npm run db:push

echo 🎉 Setup complete! Your application is ready for deployment.
echo.
echo 📋 Next steps:
echo 1. Deploy to your hosting platform ^(Railway, Vercel, Heroku, etc.^)
echo 2. Set the same environment variables in your hosting platform
echo 3. The application will automatically handle caching and token management
echo.
echo 🔧 Available commands:
echo - npm run dev ^(development^)
echo - npm start ^(production^)
echo - npm run build ^(build for production^)
pause
