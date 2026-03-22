@echo off
REM ==========================================
REM ALIP DASHBOARD DEPLOYMENT SCRIPT (Windows)
REM ==========================================

echo 🚀 Starting Alip Dashboard Deployment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js ^>= 16.0.0
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ NPM is not installed. Please install NPM ^>= 8.0.0
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=v." %%i in ('node --version') do set NODE_MAJOR=%%i
if %NODE_MAJOR% lss 16 (
    echo ❌ Node.js version must be ^>= 16. Current version: & node --version
    pause
    exit /b 1
)

echo ✅ Node.js version check passed: & node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Copying from .env.example...
    copy .env.example .env
    echo ✅ .env file created. Please edit it with your configuration!
    echo.
    echo 📝 IMPORTANT: Edit the .env file with your actual values:
    echo    - ADMIN_EMAIL
    echo    - ADMIN_USERNAME
    echo    - ADMIN_PASSWORD
    echo    - BOT_API_URL
    echo    - BOT_API_KEY
    echo.
    echo 🔧 After editing .env, run: npm start
    pause
    exit /b 0
)

REM Check if required environment variables are set
echo 🔍 Checking environment configuration...

set MISSING_VARS=
for %%v in (ADMIN_EMAIL ADMIN_USERNAME ADMIN_PASSWORD) do (
    findstr /b "%%v=" .env >nul 2>&1
    if !errorlevel! neq 0 (
        set MISSING_VARS=!MISSING_VARS! %%v
    ) else (
        findstr /b "%%v=your-" .env >nul 2>&1
        if !errorlevel! equ 0 set MISSING_VARS=!MISSING_VARS! %%v
    )
)

if defined MISSING_VARS (
    echo ⚠️  The following environment variables need to be configured:
    for %%v in (%MISSING_VARS%) do echo    - %%v
    echo.
    echo 📝 Please edit the .env file and set the actual values.
    pause
    exit /b 1
)

echo ✅ Environment configuration looks good

REM Start the application
echo 🌐 Starting Alip Dashboard...
echo.
echo 📊 Dashboard will be available at: http://localhost:3001
echo 📊 Default credentials: Check your .env file
echo.
echo 🛑 Press Ctrl+C to stop the server
echo.

npm start