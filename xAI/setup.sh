#!/bin/bash

echo "🚀 Setting up Receipt Processor with Vision AI"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p processed-receipts
mkdir -p ../iMessage/saved-images

echo "✅ Directories created"
echo ""

# Check for .env file (check both root and local)
if [ ! -f ../.env ]; then
    echo "⚠️  No .env file found at project root."
    if [ -f ../.env.example ]; then
        echo "📝 Please copy .env.example to .env and add your API keys:"
        echo "   cp .env.example .env"
        echo "   Then edit .env and add: OPENAI_API_KEY=your-api-key-here"
    else
        echo "📝 Please create a .env file at project root with:"
        echo "   OPENAI_API_KEY=your-api-key-here"
    fi
    echo ""
else
    echo "✅ Found .env file at project root"
    echo ""
fi

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure your OpenAI API key is in the root .env file"
echo "2. Place receipt images in ../iMessage/saved-images/"
echo "3. Run: npm run process (or from root: npm run receipt:process)"
echo ""

