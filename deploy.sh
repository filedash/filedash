#!/bin/bash
set -e

echo "🚀 Deploying FileDash application..."

# Run the build script first
./build.sh

# Create deployment directory
DEPLOY_DIR="./dist"
mkdir -p $DEPLOY_DIR

# Copy backend binary
echo "📦 Packaging backend binary..."
cp ./backend/target/release/filedash $DEPLOY_DIR/

# Copy frontend static files
echo "📦 Packaging frontend static files..."
mkdir -p $DEPLOY_DIR/frontend_dist
cp -r ./backend/frontend_dist/* $DEPLOY_DIR/frontend_dist/

# Copy config file
echo "📦 Copying configuration..."
cp ./backend/config.toml $DEPLOY_DIR/

echo "✅ Deployment package created in $DEPLOY_DIR"
echo "To run the application:"
echo "  cd $DEPLOY_DIR"
echo "  ./filedash"