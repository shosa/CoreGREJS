#!/bin/bash
# Script to initialize Docker volumes with correct directory structure and permissions

echo "🚀 Initializing CoreGREJS Docker volumes..."

# Create volume directory structure
mkdir -p volumes/backend/storage/export/temp
mkdir -p volumes/backend/storage/export/src
mkdir -p volumes/backend/storage/jobs
mkdir -p volumes/backend/storage/uploads
mkdir -p volumes/backend/storage/logs

# Set ownership to container user (UID 1001 = nestjs user in container)
echo "📁 Setting permissions (UID 1001:1001)..."
sudo chown -R 1001:1001 volumes/backend/storage/

# Set proper permissions (rwxr-xr-x)
sudo chmod -R 755 volumes/backend/storage/

echo "✅ Volume initialization complete!"
echo ""
echo "Directory structure:"
tree volumes/backend/storage/ 2>/dev/null || find volumes/backend/storage/ -type d

echo ""
echo "Permissions:"
ls -la volumes/backend/storage/

echo ""
echo "🐳 You can now run: docker-compose up -d"
