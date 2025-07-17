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

# Create necessary runtime directories
echo "📦 Creating runtime directories..."
mkdir -p $DEPLOY_DIR/data
mkdir -p $DEPLOY_DIR/files
mkdir -p $DEPLOY_DIR/logs

# Copy sample files if they don't exist in destination
echo "📦 Copying sample files..."
if [ -d "./backend/files" ]; then
    cp -r ./backend/files/* $DEPLOY_DIR/files/ 2>/dev/null || true
fi

echo "✅ Deployment package created in $DEPLOY_DIR"
echo ""
echo "To run the application:"
echo "  cd $DEPLOY_DIR"
echo "  ./filedash"
echo ""
echo "Default login credentials:"
echo "  Email: admin@filedash.local"
echo "  Password: admin123"
echo ""
echo "⚠️  Please change the default password in production!"
echo "🌐 Application will be available at: http://localhost:8080"