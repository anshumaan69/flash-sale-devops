import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderLatency = new Trend('order_latency');
const productLatency = new Trend('product_latency');

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Ramp up traffic
    { duration: '45s', target: 100 }, // Sustained Flash Sale peak (100 VUs)
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // P95 latency under 500ms
    errors: ['rate<0.02'],            // Error rate under 2%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3005';

export default function () {
  // 1. Product Catalog Browse
  const productsRes = http.get(`${BASE_URL}/api/products`);
  const productsOk = check(productsRes, {
    'Products HTTP 200': (r) => r.status === 200,
  });
  errorRate.add(!productsOk);
  productLatency.add(productsRes.timings.duration);

  sleep(0.5);

  // 2. Place Order Transaction
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
