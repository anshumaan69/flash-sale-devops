import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderLatency = new Trend('order_latency');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm up
    { duration: '1m', target: 50 },   // Normal load
    { duration: '1m', target: 100 },  // Flash sale spike
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.02'],            // Less than 2% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Fetch Product Catalog
  const productsRes = http.get(`${BASE_URL}/api/products`);
  const productsOk = check(productsRes, {
    'Products HTTP 200': (r) => r.status === 200,
  });
  errorRate.add(!productsOk);

  sleep(1);

  // 2. Simulate Flash Sale Purchase
  const payload = JSON.stringify({
    productId: Math.floor(Math.random() * 3) + 1,
    quantity: 1,
  });

  const headers = { 'Content-Type': 'application/json' };
  const orderRes = http.post(`${BASE_URL}/api/orders`, payload, { headers });

  const orderOk = check(orderRes, {
    'Order Placed HTTP 201': (r) => r.status === 201,
  });
  errorRate.add(!orderOk);
  orderLatency.add(orderRes.timings.duration);

  sleep(1);
}
