#!/bin/bash
# Script to execute k6 load test against local or AWS ALB target

TARGET_URL=${1:-"http://localhost:3000"}

echo "🚀 Starting HA-WebStack Flash Sale Load Test against: $TARGET_URL"
echo "============================================================"

BASE_URL=$TARGET_URL k6 run load-test.js
