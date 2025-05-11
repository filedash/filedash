#!/bin/bash
set -e

echo "🚀 Building FileDash application..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backend
echo "📦 Building backend..."
cd backend
cargo build --release
cd ..

echo "✅ Build completed successfully!"
echo "To start the application, run: ./backend/target/release/filedash"