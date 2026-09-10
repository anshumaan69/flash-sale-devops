-- MySQL Schema for HA-WebStack Flash Sale Database

CREATE DATABASE IF NOT EXISTS flashsale;
USE flashsale;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for testing
INSERT INTO products (name, price, stock) VALUES
('UltraSmart Watch X', 99.99, 500),
('Noise-Canceling Headphones', 149.99, 350),
('Pro Gaming Controller', 59.99, 200)
ON DUPLICATE KEY UPDATE name=VALUES(name);
