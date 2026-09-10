const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Prometheus Metrics Configuration ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of successfully placed flash sale orders',
  labelNames: ['status']
});

const dbConnectionPoolActive = new client.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active DB connections'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(ordersCreatedTotal);
register.registerMetric(dbConnectionPoolActive);

// Middleware for metrics collection
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
  });
  next();
});

// --- Database Connection Pool Setup ---
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'flashsale',
  connectionLimit: 10,
  connectTimeout: 5000,
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// In-memory fallback catalog for high resilience simulation
const mockProducts = [
  { id: 1, name: 'UltraSmart Watch X', price: 99.99, stock: 500 },
  { id: 2, name: 'Noise-Canceling Headphones', price: 149.99, stock: 350 },
  { id: 3, name: 'Pro Gaming Controller', price: 59.99, stock: 200 }
];

// --- Endpoints ---

// Health Check Endpoint (ALB Target Group Health Check)
app.get('/health', async (req, res) => {
  try {
    // Optionally check DB connectivity if host is configured
    if (process.env.DB_HOST) {
      const conn = await getPool().getConnection();
      conn.release();
    }
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(200).json({ status: 'DEGRADED', db_error: err.message, timestamp: new Date().toISOString() });
  }
});

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Homepage / Welcome
app.get('/', (req, res) => {
  res.json({
    service: 'HA-WebStack Flash Sale API',
    status: 'running',
    endpoints: ['/health', '/metrics', '/api/products', '/api/orders']
  });
});

// Get Products Catalog
app.get('/api/products', async (req, res) => {
  try {
    if (process.env.DB_HOST) {
      const [rows] = await getPool().query('SELECT * FROM products');
      return res.json(rows);
    }
    res.json(mockProducts);
  } catch (err) {
    console.error('Database query error, returning fallback products:', err.message);
    res.json(mockProducts);
  }
});

// Place Order (Flash Sale Business Logic)
app.post('/api/orders', async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    if (process.env.DB_HOST) {
      const [result] = await getPool().query(
        'INSERT INTO orders (order_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
        [orderId, productId, quantity, 'CONFIRMED']
      );
      ordersCreatedTotal.labels('success').inc();
      return res.status(201).json({
        success: true,
        orderId,
        productId,
        quantity,
        dbRecordId: result.insertId,
        timestamp: new Date().toISOString()
      });
    }

    // In-memory simulation if DB not configured
    ordersCreatedTotal.labels('success').inc();
    res.status(201).json({
      success: true,
      orderId,
      productId,
      quantity,
      mode: 'simulated',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Order creation error:', err.message);
    ordersCreatedTotal.labels('failed').inc();
    res.status(500).json({ success: false, error: 'Order processing failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`HA-WebStack Backend server listening on port ${PORT}`);
});
