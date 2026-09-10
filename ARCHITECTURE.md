# High Availability Web Architecture on AWS
**Complete Project Documentation with Open-Source Observability Stack**  
**Project Codename:** HA-WebStack  
**Version:** 1.0  
**Target Platform:** AWS Free Tier (Development) / AWS Production (Scale-up path)  
**Observability Stack:** Prometheus + Grafana + Loki + k6 (replacing CloudWatch)  
**Infrastructure Cost Target:** $0/month (Free Tier) for demonstration  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Business Context and Real-World Scenario](#2-business-context-and-real-world-scenario)
3. [Technology Stack](#3-technology-stack)
4. [Complete Architecture Diagram](#4-complete-architecture-diagram)
5. [Network Topology and Subnet Design](#5-network-topology-and-subnet-design)
6. [Detailed Component Design](#6-detailed-component-design)
7. [Observability Stack Architecture](#7-observability-stack-architecture)
8. [Failure Scenarios and Automatic Recovery](#8-failure-scenarios-and-automatic-recovery)
9. [Implementation Phases](#9-implementation-phases)
10. [Load Testing Strategy with k6](#10-load-testing-strategy-with-k6)
11. [Free Tier Constraints and Mitigations](#11-free-tier-constraints-and-mitigations)
12. [Monitoring Dashboards and Alerting](#12-monitoring-dashboards-and-alerting)
13. [Runbooks and Operational Procedures](#13-runbooks-and-operational-procedures)
14. [Scale-Up Path to Production](#14-scale-up-path-to-production)
15. [Project Deliverables Checklist](#15-project-deliverables-checklist)
16. [Conclusion](#16-conclusion)

---

## 1. Executive Summary
This document describes the design and implementation of a highly available web application on AWS that demonstrates automatic failover across both compute and database tiers. Unlike typical tutorials that rely on AWS CloudWatch, this project uses a fully open-source observability stack consisting of Prometheus (metrics), Grafana (visualization), Loki (logs), and k6 (load testing).

The architecture is deployed on AWS Free Tier to ensure accessibility, while maintaining the same design patterns used in production environments. Every failure scenario—server crashes, availability zone outages, and database primary failures—is designed to trigger automatic recovery without manual intervention.

### Key Differentiators:
- **Open-source observability** replacing CloudWatch
- **Real load testing with k6** demonstrating failover under traffic
- **Multi-AZ deployment** for both compute and database
- **100% Free Tier compatible** for demonstration
- **Production-ready patterns** with a clear scale-up path

---

## 2. Business Context and Real-World Scenario

### 2.1 Primary Use Case: Flash Sale E-Commerce Platform
The project simulates an e-commerce platform handling flash sales—a scenario where traffic spikes 10x within minutes and downtime directly translates to revenue loss.

#### Business Requirements:
| Requirement | Target | Business Impact |
| :--- | :--- | :--- |
| **Availability** | 99.9% uptime | $10,000/minute revenue protected |
| **Database Failover** | < 120 seconds | No customer transaction loss |
| **Server Failover** | < 60 seconds | Seamless user experience |
| **Load Capacity** | 1000 req/s sustained | Handles peak flash sale traffic |
| **Observability** | Full metrics + logs | Rapid incident response |

### 2.2 Why This Architecture Matters
During flash sales, e-commerce platforms face three critical risks:
1. **Compute Failure:** Web servers crash under load, causing 503 errors.
2. **Database Bottleneck:** Connection pool exhaustion slows transactions.
3. **Observability Blind Spot:** Without monitoring, failures go undetected until customers complain.

This architecture addresses all three through multi-AZ redundancy, connection pooling via RDS Proxy, and a comprehensive open-source observability stack.

### 2.3 Business Logic Flow
```text
Customer Request → Route 53 (DNS) → CloudFront (CDN)
       ↓
Application Load Balancer (Multi-AZ)
       ↓
Web Tier (Nginx, Auto Scaling)
       ↓
Application Tier (Node.js/Python, Auto Scaling)
       ↓
RDS Proxy → RDS Multi-AZ (Primary + Standby)
       ↓
Order Confirmation → Customer

Throughout: Prometheus scrapes metrics, Loki ingests logs, Grafana visualizes
```

#### Transaction Flow:
1. Customer initiates product purchase.
2. Load balancer distributes request to healthy web server.
3. Web server forwards to application server for business logic.
4. Application server validates inventory via RDS Proxy.
5. Order is written to RDS primary with synchronous replication to standby.
6. Confirmation returned to customer.
7. Prometheus captures latency metrics; Loki logs the transaction.
8. Grafana dashboard updates in real time.

---

## 3. Technology Stack

### 3.1 Complete Stack Overview
| Layer | AWS Services | Open Source / Third-Party | Purpose |
| :--- | :--- | :--- | :--- |
| **DNS** | Route 53 | - | Health-check based failover |
| **CDN / WAF** | CloudFront, AWS WAF | - | Global delivery, DDoS protection |
| **Load Balancing** | Application Load Balancer | Nginx (in-instance) | Traffic distribution |
| **Compute** | EC2, Auto Scaling Groups | Ubuntu 22.04, systemd | Web and app hosting |
| **Database** | RDS Multi-AZ (MySQL/PostgreSQL) | - | Automatic failover |
| **DB Connection Pooling** | RDS Proxy | - | Failover resilience |
| **Caching** | ElastiCache (Redis) | Redis | Session + query cache |
| **Metrics** | - | Prometheus | Time-series metrics |
| **Visualization** | - | Grafana | Dashboards |
| **Logs** | - | Loki + Promtail | Log aggregation |
| **Load Testing** | - | k6 | Performance validation |
| **Alerting** | - | Alertmanager | Notification routing |
| **Containers** | EC2 | Docker, Docker Compose | Service isolation |

### 3.2 Why Open Source Over CloudWatch?
| Aspect | CloudWatch | Open-Source Stack |
| :--- | :--- | :--- |
| **Cost** | Free tier limited, then $$ | $0 on Free Tier |
| **Portability** | AWS-locked | Runs anywhere |
| **Learning value** | AWS-specific | Industry-standard tools |
| **Flexibility** | Fixed schema | Fully customizable |
| **Log querying** | CloudWatch Logs Insights | LogQL (Loki) |
| **Metrics querying** | CloudWatch Metrics | PromQL (Prometheus) |

> **Design Principle:** The observability stack must run outside the monitored infrastructure so it survives infrastructure failures. On Free Tier, this means a separate dedicated EC2 instance hosting Prometheus + Grafana + Loki.

---

## 4. Complete Architecture Diagram

### 4.1 High-Level Architecture
```text
                          ┌─────────────────────────────┐
                          │        Internet Users       │
                          └──────────────┬──────────────┘
                                         │
                          ┌──────────────▼──────────────┐
                          │   Route 53 (DNS Failover)   │
                          │   Health Checks + A Records │
                          └──────────────┬──────────────┘
                                         │
                          ┌──────────────▼──────────────┐
                          │   CloudFront + AWS WAF      │
                          │   CDN, DDoS Protection      │
                          └──────────────┬──────────────┘
                                         │
        ═════════════════════════════════╪═════════════════════════════════
                              AWS REGION (ap-south-1)
        ═════════════════════════════════╪═════════════════════════════════
                                         │
                          ┌──────────────▼──────────────┐
                          │  Application Load Balancer  │
                          │  (Internet-facing, 2 AZs)   │
                          └──────┬──────────────┬───────┘
                                 │              │
        ┌────────────────────────┘              └───────────────────────┐
        │                                                                │
┌───────▼────────────────────┐                       ┌───────────────────▼────────┐
│  Availability Zone A       │                       │  Availability Zone B       │
│  10.0.1.0/24 (Public)      │                       │  10.0.2.0/24 (Public)      │
│  10.0.11.0/24 (Private)    │                       │  10.0.12.0/24 (Private)    │
│                            │                       │                            │
│  ┌──────────────────────┐  │                       │  ┌──────────────────────┐  │
│  │ Web Server (EC2)     │  │                       │  │ Web Server (EC2)     │  │
│  │ Nginx + Node Exporter│  │                       │  │ Nginx + Node Exporter│  │
│  └──────────┬───────────┘  │                       │  └──────────┬───────────┘  │
│             │              │                       │             │              │
│  ┌──────────▼───────────┐  │                       │  ┌──────────▼───────────┐  │
│  │ App Server (EC2)     │  │                       │  │ App Server (EC2)     │  │
│  │ Node.js + Promtail   │  │                       │  │ Node.js + Promtail   │  │
│  └──────────┬───────────┘  │                       │  └──────────┬───────────┘  │
│             │              │                       │             │              │
│  ┌──────────▼───────────┐  │                       │  ┌──────────▼───────────┐  │
│  │ RDS Primary          │◄─┼───── Sync Replication ┼─►│ RDS Standby          │  │
│  │ (Multi-AZ enabled)   │  │                       │  │ (Auto-promoted)      │  │
│  └──────────────────────┘  │                       │  └──────────────────────┘  │
└────────────────────────────┘                       └────────────────────────────┘
        │                                                        │
        └────────────────────┬───────────────────────────────────┘
                             │
                 ┌───────────▼────────────┐
                 │  ElastiCache (Redis)   │
                 │  Session + Query Cache │
                 └────────────────────────┘

        ═════════════════════════════════════════════════════════════════
                     OBSERVABILITY PLANE (Separate Subnet)
        ═════════════════════════════════════════════════════════════════

                 ┌────────────────────────────────────┐
                 │  Observability EC2 (t2.micro #2)   │
                 │  Private Subnet 10.0.20.0/24       │
                 │                                    │
                 │  ┌──────────────────────────────┐  │
                 │  │  Prometheus (port 9090)      │  │
                 │  │  Scrapes node_exporter,      │  │
                 │  │  app metrics every 15s       │  │
                 │  └──────────────┬───────────────┘  │
                 │                 │                  │
                 │  ┌──────────────▼───────────────┐  │
                 │  │  Grafana (port 3000)         │  │
                 │  │  Dashboards + Alerting       │  │
                 │  └──────────────┬───────────────┘  │
                 │                 │                  │
                 │  ┌──────────────▼───────────────┐  │
                 │  │  Loki (port 3100)            │  │
                 │  │  Log aggregation from        │  │
                 │  │  Promtail agents             │  │
                 │  └──────────────────────────────┘  │
                 │                                    │
                 │  ┌──────────────────────────────┐  │
                 │  │  Alertmanager (port 9093)    │  │
                 │  │  Email/Slack notifications   │  │
                 │  └──────────────────────────────┘  │
                 └────────────────────────────────────┘

                 ┌────────────────────────────────────┐
                 │  Load Testing EC2 (t2.micro #3)    │
                 │  Only running during tests         │
                 │                                    │
                 │  ┌──────────────────────────────┐  │
                 │  │  k6 load generator           │  │
                 │  │  Scripted scenarios          │  │
                 │  │  Results → Prometheus        │  │
                 │  └──────────────────────────────┘  │
                 └────────────────────────────────────┘
```

### 4.2 Data Flow Diagram (Metrics + Logs)
```text
┌─────────────────────────────────────────────────────────────────────┐
│                        METRICS PIPELINE                              │
└─────────────────────────────────────────────────────────────────────┘

  Web Server          App Server          RDS          ElastiCache
  Node Exporter       Node Exporter       Exporter     Exporter
  (9100)              (9100) + app /metrics              (9121)
       │                   │                 │              │
       └───────────────────┴─────────────────┴──────────────┘
                                  │
                       HTTP pull every 15s
                                  │
                                  ▼
                        ┌──────────────────┐
                        │   Prometheus     │
                        │   TSDB Storage   │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │     Grafana      │
                        │   Dashboards     │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Alertmanager    │
                        │  Email / Slack   │
                        └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          LOGS PIPELINE                               │
└─────────────────────────────────────────────────────────────────────┘

  Web Server          App Server          RDS
  /var/log/nginx      app.log             Slow query log
       │                   │                 │
       └───────────────────┴─────────────────┘
                          │
                     Promtail agents
                   (push over HTTP)
                          │
                          ▼
                 ┌──────────────────┐
                 │      Loki        │
                 │  Log Storage     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │     Grafana      │
                 │  LogQL Explorer  │
                 └──────────────────┘
```

### 4.3 Failover Decision Tree
```text
                    ┌──────────────────────┐
                    │  Failure Detected    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │EC2 Failure │   │ AZ Failure │   │RDS Failure │
       └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
             │                │                │
             ▼                ▼                ▼
       ALB health check   ALB stops       RDS detects
       marks unhealthy    routing to AZ   primary failure
             │                │                │
             ▼                ▼                ▼
       ASG terminates     ASG launches    Standby promoted
       and replaces       in healthy AZ   to primary
             │                │                │
             ▼                ▼                ▼
       Service restored   Service restored  DNS updated
       in 2-4 min         in 3-5 min        in 60-120s
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Alerts fired to     │
                    │  Alertmanager        │
                    └──────────────────────┘
```

---

## 5. Network Topology and Subnet Design

### 5.1 VPC Configuration
**VPC CIDR:** `10.0.0.0/16` (65,536 addresses)

| Subnet Name | CIDR | AZ | Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `public-a` | 10.0.1.0/24 | ap-south-1a | Public | ALB, NAT Gateway A |
| `public-b` | 10.0.2.0/24 | ap-south-1b | Public | ALB, NAT Gateway B |
| `private-web-a` | 10.0.11.0/24 | ap-south-1a | Private | Web servers AZ-A |
| `private-web-b` | 10.0.12.0/24 | ap-south-1b | Private | Web servers AZ-B |
| `private-app-a` | 10.0.13.0/24 | ap-south-1a | Private | App servers AZ-A |
| `private-app-b` | 10.0.14.0/24 | ap-south-1b | Private | App servers AZ-B |
| `private-db` | 10.0.15.0/24 | ap-south-1a | Private | RDS Primary |
| `private-db-b` | 10.0.16.0/24 | ap-south-1b | Private | RDS Standby |
| `private-obs` | 10.0.20.0/24 | ap-south-1a | Private | Observability stack |

### 5.2 Security Group Matrix
| Source ↓ / Target → | ALB SG | Web SG | App SG | DB SG | Obs SG |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Internet (0.0.0.0/0)** | 80, 443 | - | - | - | - |
| **ALB SG** | - | 80 | - | - | - |
| **Web SG** | - | - | 3000 | - | - |
| **App SG** | - | - | - | 3306 | - |
| **Obs SG** | - | 9100 | 9100 | 9104 | - |

> **Key Principle:** Observability server pulls metrics from all nodes; no node pushes to observability (except logs via Promtail).

### 5.3 Routing
| Route Table | Associated Subnets | Routes |
| :--- | :--- | :--- |
| **Public RT** | `public-a`, `public-b` | 0.0.0.0/0 → IGW |
| **Private RT-A** | `private-web-a`, `private-app-a`, `private-db`, `private-obs` | 0.0.0.0/0 → NAT-A |
| **Private RT-B** | `private-web-b`, `private-app-b`, `private-db-b` | 0.0.0.0/0 → NAT-B |

---

## 6. Detailed Component Design

### 6.1 Web Tier
- **Instance Type:** t2.micro (Free Tier)
- **AMI:** Ubuntu 22.04 LTS
- **Count:** 2 (one per AZ), scalable to 4
- **Software Stack:** Nginx 1.18+, Node Exporter, Promtail

```bash
#!/bin/bash
apt-get update && apt-get install -y nginx prometheus-node-exporter
# Install Promtail for Loki
curl -O -L "https://github.com/grafana/loki/releases/latest/download/promtail-linux-amd64.zip"
unzip promtail-linux-amd64.zip -d /usr/local/bin/
# Configure Promtail to ship Nginx logs to Loki
cat > /etc/promtail/config.yml <<EOF
server:
  http_listen_port: 9080
clients:
  - url: http://10.0.20.10:3100/loki/api/v1/push
scrape_configs:
  - job_name: nginx
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
EOF
systemctl enable promtail && systemctl start promtail
```

### 6.2 Application Tier
- **Instance Type:** t2.micro
- **Runtime:** Node.js 18 LTS (or Python 3.11 + Gunicorn)
- **Count:** 2 (one per AZ)

#### Application Endpoints:
| Endpoint | Purpose |
| :--- | :--- |
| `/` | Homepage |
| `/health` | ALB health check |
| `/metrics` | Prometheus metrics |
| `/api/orders` | Business logic endpoint |
| `/api/products` | Product catalog |

#### Key Metrics Exposed (`/metrics`):
```text
http_requests_total{method, endpoint, status}
http_request_duration_seconds{endpoint}
db_query_duration_seconds{query_type}
db_connection_pool_active
db_connection_pool_idle
```

### 6.3 Database Tier
- **Engine:** MySQL 8.0 (or PostgreSQL 14)
- **Instance Class:** db.t3.micro (Free Tier eligible for 750 hours)
- **Deployment:** Multi-AZ with one standby
- **Storage:** gp2, 20 GB

#### RDS Proxy Configuration:
- **Connection pool size:** 50% of max_connections
- **Max idle connections:** 20% of pool
- **Idle client timeout:** 1800 seconds
- **Failover:** automatic, benefits from proxy connection pooling

> **Why RDS Proxy is Critical Here:** Without RDS Proxy, when failover occurs, all application connections break and must re-establish. With RDS Proxy, the proxy maintains a pool and reconnects transparently, reducing application-side errors by ~70%.

---

## 7. Observability Stack Architecture

### 7.1 Observability EC2 Instance
- **Instance Type:** t2.micro (Free Tier)
- **Subnet:** private-obs (10.0.20.0/24)
- **Storage:** 20 GB gp2
- **Deployment:** Docker Compose

### 7.2 Docker Compose Configuration
```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:v2.48.0
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=7d'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    mem_limit: 300m

  grafana:
    image: grafana/grafana:10.2.0
    ports: ["3000:3000"]
    volumes:
      - grafana-data:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    mem_limit: 200m

  loki:
    image: grafana/loki:2.9.0
    ports: ["3100:3100"]
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    mem_limit: 250m

  alertmanager:
    image: prom/alertmanager:v0.26.0
    ports: ["9093:9093"]
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    restart: unless-stopped
    mem_limit: 100m

volumes:
  prometheus-data:
  grafana-data:
  loki-data:
```
*Total Memory Budget:* ~850 MB of 1 GB (leaves ~150 MB for OS).

---

## 8. Failure Scenarios and Automatic Recovery

### 8.1 Scenario Matrix
| # | Failure | Detection | Recovery | RTO | Data Loss |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Web server crash | ALB health check (30s) | ASG replaces (2-4 min) | 3 min | None |
| **2** | App server crash | ALB health check | ASG replaces | 3 min | None |
| **3** | AZ outage | ALB + ASG detect | Traffic to healthy AZ | 1 min | None |
| **4** | RDS primary failure | RDS monitor | Standby promoted | 60-120s | None (sync) |
| **5** | RDS Proxy failure | Connection errors | Auto-recovery (multi-AZ) | 30s | None |
| **6** | Observability server down | Self-monitoring alert | Manual restart | 5 min | Metrics gap |

### 8.2 Demonstrable Failure Scenarios
1. **EC2 Termination:** `aws ec2 terminate-instances --instance-ids i-xxxxx`
2. **RDS Force Failover:** `aws rds reboot-db-instance --db-instance-identifier ha-db --force-failover`
3. **Simulated AZ Outage:** Stop instances in one AZ.

---

## 9. Implementation Phases

```text
Phase 1: Foundation (VPC, Subnets, Gateways, Route Tables, Security Groups)
Phase 2: Database Layer (RDS Multi-AZ, DB Subnet Group, RDS Proxy)
Phase 3: Compute & App Tier (Launch Templates, ASGs, ALB, Application Code)
Phase 4: Observability Stack (Prometheus, Grafana, Loki, Alertmanager, Promtail)
Phase 5: Load Testing & Verification (k6 script execution, failover test)
Phase 6: Runbooks & Documentation Finalization
```

---

## 10. Load Testing Strategy with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderLatency = new Trend('order_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, { 'products OK': (r) => r.status === 200 });
  errorRate.add(productsRes.status !== 200);

  sleep(1);

  const orderRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
    productId: Math.floor(Math.random() * 100),
    quantity: 1,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(orderRes, { 'order OK': (r) => r.status === 201 });
  errorRate.add(orderRes.status !== 201);
  orderLatency.add(orderRes.timings.duration);

  sleep(2);
}
```

---

## 11. Free Tier Constraints and Mitigations

| Resource | Free Tier Limit | Real Cost Mitigation Strategy |
| :--- | :--- | :--- |
| **EC2 t2.micro hours** | 750h/month | Stop instances when not running demo; keep active instances to minimum |
| **NAT Gateway** | Not free | Use 1 NAT Gateway for dev/demo ($0.045/hr) |
| **ALB** | Not free | Run ALB during test window ($0.025/hr + LCU) |
| **Demo window** | - | Run full stack for a 4-6 hour window (total cost < $2) |

---

## 12. Monitoring Dashboards and Alerting
Critical alerts defined in Alertmanager for InstanceDown, HighCPU, DBConnectionPoolExhausted, HighRequestLatency.

---

## 13. Runbooks and Operational Procedures
Detailed procedures for Web Server Failure, RDS Failover, and Observability Stack Recovery.

---

## 14. Scale-Up Path to Production
Path from development (`t2.micro`, single NAT, Redis container) to production (`m6i.large`, multi-AZ NAT, ElastiCache cluster, Managed Prometheus/Grafana).

---

## 15. Project Deliverables Checklist
- [x] Complete Architecture Spec (`ARCHITECTURE.md`)
- [ ] Infrastructure as Code (Terraform)
- [ ] Application Tier Implementation (Node.js/Express with `/health` & `/metrics`)
- [ ] Observability Stack (Docker Compose + configs)
- [ ] k6 Load Testing Suite
- [ ] Failover Verification & Runbooks

---

## 16. Conclusion
HA-WebStack provides a practical, high-availability blueprint on AWS using open-source monitoring tools.
