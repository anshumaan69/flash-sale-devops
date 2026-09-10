#!/bin/bash
# Startup User Data script for Observability EC2 Instance (t2.micro)
set -e

apt-get update && apt-get install -y docker.io docker-compose git

systemctl enable docker
systemctl start docker

mkdir -p /opt/ha-webstack
cd /opt/ha-webstack

# Clone repository or pull configuration
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: ha_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.2.0
    container_name: ha_grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

  loki:
    image: grafana/loki:2.9.0
    container_name: ha_loki
    ports:
      - "3100:3100"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
EOF

cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'app-tier'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['10.0.13.10:3000', '10.0.14.10:3000']
EOF

docker-compose up -d

echo "✅ Observability Stack Deployed Successfully!"
