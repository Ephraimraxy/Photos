@echo off
echo 🚀 Setting up Photos application for production deployment...

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file...
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
        echo.
        echo # Paystack Configuration ^(Production Keys^)
        echo PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
        echo PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
        echo.
        echo # Google Drive Configuration
        echo GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
        echo GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret
        echo GOOGLE_DRIVE_ACCESS_TOKEN=your_access_token
        echo GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
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
