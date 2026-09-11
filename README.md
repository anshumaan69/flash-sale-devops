# High Availability Web Architecture on AWS (HA-WebStack)

![HA-WebStack CI/CD](https://github.com/anshumaan69/flash-sale-devops/actions/workflows/ci-cd.yml/badge.svg)
**Project Codename:** HA-WebStack  
**Version:** 1.0  
**Observability Stack:** Prometheus + Grafana + Loki + Alertmanager + k6  

---

## 📌 Project Overview
HA-WebStack is a production-grade, highly available e-commerce platform built to withstand flash sale traffic spikes (10x normal load) with automated multi-AZ compute and database failover.

Unlike traditional cloud deployments locked into proprietary monitoring, HA-WebStack features a **100% open-source observability stack** (Prometheus metrics, Grafana dashboards, Loki log aggregation, and k6 load testing).

---

## 🚀 Key Features & Architecture
- **Multi-AZ Network Topology:** AWS VPC across 2 Availability Zones (`ap-south-1a`, `ap-south-1b`).
- **Resilient Compute Tier:** Auto-scaled web and app servers behind an Application Load Balancer.
- **Database Failover:** Multi-AZ RDS MySQL with **RDS Proxy connection pooling** to mitigate connection drops during failover.
- **Open-Source Observability:** Auto-provisioned Grafana dashboards, Prometheus time-series metrics (`/metrics`), and Loki log aggregation.
- **k6 Flash Sale Load Generator:** Automated performance benchmark verifying P95 latency < 500ms under 100 concurrent virtual users.

---

## 📂 Project Structure
```text
flash-sale-devops/
├── ARCHITECTURE.md                  # Complete HA-WebStack Architecture Specification
├── RUNBOOKS.md                      # Incident Response & Failover Runbooks
├── docker-compose.yml               # Local Multi-Container Stack (App, MySQL, Prometheus, Grafana, Loki, Alertmanager)
├── .github/workflows/ci-cd.yml      # CI/CD Pipeline Workflow (dev, uat, prod, main)
├── backend/                         # Node.js Express API Service
│   ├── server.js                    # Endpoints (/health, /metrics, /api/products, /api/orders)
│   ├── schema.sql                   # MySQL DB Schema & seed data
│   └── Dockerfile                   # Node.js Container Definition
├── frontend/                        # Next.js Flash Sale Storefront
│   ├── app/page.tsx                 # Storefront UI with live health badges & instant order modal
│   └── next.config.ts               # API Rewrites & Proxy rules
├── observability/                   # Open-Source Observability Configuration
│   ├── prometheus/                  # Scraping rules & Alert definitions
│   ├── loki/                        # Log storage & retention config
│   ├── alertmanager/                # Alert routing rules
│   └── grafana/provisioning/        # Auto-provisioned Datasources & Dashboards
├── load-testing/                    # k6 Load Testing Suite
│   ├── load-test.js                 # k6 load script (100 VUs)
│   └── run-benchmark.sh             # Benchmark execution runner
└── aws-scripts/                     # AWS CLI Deployment Scripts
    ├── 01-setup-vpc.sh              # VPC & Subnet topology automation
    ├── 02-setup-security-groups.sh  # Zero-Trust Security Groups
    ├── 03-deploy-observability.sh   # Observability EC2 User-Data script
    └── 04-deploy-app.sh             # Application EC2 User-Data script
```

---

## 🛠️ Quick Start (Local Docker Compose)

### 1. Clone Repository & Start Services
```bash
git clone https://github.com/anshumaan69/flash-sale-devops.git
cd flash-sale-devops

# Spin up complete stack (MySQL, App, Prometheus, Grafana, Loki, Alertmanager)
docker compose up -d --build
```

### 2. Access Local Services
- **Next.js Storefront:** `http://localhost:3000` (or `npm run dev` in `frontend/`)
- **Backend API:** `http://localhost:3005/health` & `http://localhost:3005/metrics`
- **Grafana Dashboard:** `http://localhost:3001` (Credentials: `admin` / `admin`)
- **Prometheus UI:** `http://localhost:9095`
- **Alertmanager UI:** `http://localhost:9094`

---

## ⚡ Running Load Benchmark (k6)

To execute a 100 Virtual User flash sale load benchmark:
```bash
./load-testing/run-benchmark.sh
```

### Measured Benchmark Summary:
- **Total Requests Processed:** 4,722 requests (62 req/sec)
- **Total Orders Placed:** 2,361 flash sale orders
- **P95 Latency:** **113.13 ms** (Target SLO < 500 ms ✅)
- **Error Rate:** **0.12 %** (Target SLO < 2.0 % ✅)

---

## 🌳 Branching Strategy
- **`main`**: Production-ready codebase & documentation.
- **`dev`**: Sandbox development environment (AWS Free Tier).
- **`uat`**: User Acceptance Testing environment.
- **`prod`**: Multi-AZ AWS Production deployment.
