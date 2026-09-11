# HA-WebStack Runbooks & Operational Procedures

This document provides step-by-step procedures for operating, troubleshooting, and testing automatic failover on the **HA-WebStack** platform.

---

## 1. Runbook: Web / Compute Tier Instance Failure

### Trigger
- Alertmanager fires `InstanceDown` alert for target `tier="app"` or `tier="web"`.
- Prometheus metric `up{job="backend-app"} == 0`.

### Diagnostic Steps
1. Open Grafana Dashboard $\rightarrow$ **HA-WebStack System Overview**.
2. Identify the impacted node IP (`10.0.13.10` or `10.0.14.10`).
3. Check container logs via Loki query in Grafana:
   ```logql
   {job="app"} |= "error"
   ```

### Immediate Resolution Actions
1. **Manual Replacement (AWS CLI):**
   ```bash
   aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
   ```
2. **Auto Scaling Group Recovery Verification:**
   - Verify ALB target group health status:
     ```bash
     aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
     ```
   - Auto Scaling Group will automatically launch a replacement instance within 2 minutes.
   - Traffic continues seamlessly through the surviving instance in AZ-B.

---

## 2. Runbook: RDS Multi-AZ Database Failover

### Trigger
- Briefly elevated request latency or DB connection error logs in Loki:
  ```logql
  {job="app"} |= "Database query error"
  ```

### Diagnostic & Verification Steps
1. Execute force failover command (for demonstration/testing):
   ```bash
   aws rds reboot-db-instance --db-instance-identifier ha-db --force-failover
   ```
2. Check RDS Event logs:
   ```bash
   aws rds describe-events --source-identifier ha-db --source-type db-instance
   ```

### Expected Behavior & Connection Pool Recovery
- **RDS Proxy Isolation:** RDS Proxy buffers incoming client connections during the 60–120s standby promotion window.
- **Failover Timings:** DNS updates to new primary complete within 60 seconds; application pool automatically reconnects without process restart.

---

## 3. Runbook: Observability Stack Down

### Trigger
- Unable to access Grafana UI (`http://<OBS_IP>:3001` or port 3000) or Prometheus targets page.

### Resolution Steps
1. SSH into the Observability EC2 instance:
   ```bash
   ssh ubuntu@<OBS_INSTANCE_IP>
   ```
2. Check container status:
   ```bash
   docker ps -a
   ```
3. Check disk space (Loki chunk storage usage):
   ```bash
   df -h /var/lib/docker
   ```
4. Restart the stack:
   ```bash
   docker compose down && docker compose up -d
   ```
5. Verify targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```
