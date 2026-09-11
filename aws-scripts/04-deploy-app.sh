#!/bin/bash
# EC2 User-Data startup script to deploy App Tier container & Promtail on Ubuntu 22.04
set -e

apt-get update && apt-get install -y docker.io docker-compose git

systemctl enable docker
systemctl start docker

# Create application workspace
mkdir -p /opt/ha-backend
cd /opt/ha-backend

# Write systemd service or launch application container
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
EOF

echo "✅ App Tier deployment script initialized!"
