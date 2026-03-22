#!/bin/bash

# ==========================================
# ALIP DASHBOARD DEPLOYMENT SCRIPT
# ==========================================

echo "🚀 Starting Alip Dashboard Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 16.0.0"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ NPM is not installed. Please install NPM >= 8.0.0"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version must be >= 16. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration!"
    echo ""
    echo "📝 IMPORTANT: Edit the .env file with your actual values:"
    echo "   - ADMIN_EMAIL"
    echo "   - ADMIN_USERNAME"
    echo "   - ADMIN_PASSWORD"
    echo "   - BOT_API_URL"
    echo "   - BOT_API_KEY"
    echo ""
    echo "🔧 After editing .env, run: npm start"
    exit 0
fi

# Check if required environment variables are set
echo "🔍 Checking environment configuration..."

REQUIRED_VARS=("ADMIN_EMAIL" "ADMIN_USERNAME" "ADMIN_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env || grep -q "^$var=your-" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "⚠️  The following environment variables need to be configured:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📝 Please edit the .env file and set the actual values."
    exit 1
fi

echo "✅ Environment configuration looks good"

# Start the application
echo "🌐 Starting Alip Dashboard..."
echo ""
echo "📊 Dashboard will be available at: http://localhost:$PORT"
echo "📊 Default credentials: $ADMIN_USERNAME / [configured password]"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

npm start