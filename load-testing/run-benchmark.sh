#!/bin/bash
# HA-WebStack Automated Load Test & Failover Benchmark Runner
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Default to container service name if running in Docker network
NETWORK_NAME=$(docker network ls | grep -E "flash-sale_default|ha-webstack_default" | awk '{print $2}' | head -n 1)
NETWORK_NAME=${NETWORK_NAME:-"flash-sale_default"}

TARGET_URL=${1:-"http://app:3000"}

echo "=========================================================="
echo "⚡ HA-WebStack Flash Sale Load Test & Performance Benchmark"
echo "Target Endpoint: $TARGET_URL"
echo "Docker Network: $NETWORK_NAME"
echo "=========================================================="

if ! command -v k6 &> /dev/null; then
    echo "⚠️  k6 load generator not found on host. Running via Docker container on $NETWORK_NAME..."
    docker run --rm -i --net="$NETWORK_NAME" -e BASE_URL="$TARGET_URL" grafana/k6 run - < "$SCRIPT_DIR/load-test.js"
else
    BASE_URL="$TARGET_URL" k6 run "$SCRIPT_DIR/load-test.js"
fi

echo ""
echo "✅ Benchmark Execution Completed!"
