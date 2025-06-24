#!/bin/bash
set -e

echo "🚀 Building FileDash application..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install

# Check if we should use mock API (for Docker builds, default to false)
if [ "${USE_MOCK_API:-false}" = "true" ]; then
    echo "🔧 Building with mock API enabled"
    VITE_USE_MOCK_API=true npm run build
else
    echo "🔧 Building with real API"
    npm run build
fi
cd ..

# Build backend
echo "📦 Building backend..."
cd backend
cargo build --release
cd ..

echo "✅ Build completed successfully!"
echo "To start the application, run: ./backend/target/release/filedash"