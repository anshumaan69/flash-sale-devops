#!/bin/bash
# AWS CLI script to set up Security Groups for HA-WebStack
set -e

VPC_ID=$1
REGION="ap-south-1"

if [ -z "$VPC_ID" ]; then
  echo "Usage: ./02-setup-security-groups.sh <VPC_ID>"
  exit 1
fi

echo "Creating Security Groups in VPC $VPC_ID..."

# ALB SG
ALB_SG=$(aws ec2 create-security-group --group-name ha-alb-sg --description "ALB Security Group" --vpc-id $VPC_ID --region $REGION --output text)
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION

# App SG
APP_SG=$(aws ec2 create-security-group --group-name ha-app-sg --description "App Server Security Group" --vpc-id $VPC_ID --region $REGION --output text)
aws ec2 authorize-security-group-ingress --group-id $APP_SG --protocol tcp --port 3000 --source-group $ALB_SG --region $REGION

# Observability SG
OBS_SG=$(aws ec2 create-security-group --group-name ha-obs-sg --description "Observability Stack Security Group" --vpc-id $VPC_ID --region $REGION --output text)
aws ec2 authorize-security-group-ingress --group-id $OBS_SG --protocol tcp --port 3000 --cidr 10.0.0.0/16 --region $REGION
aws ec2 authorize-security-group-ingress --group-id $OBS_SG --protocol tcp --port 9090 --cidr 10.0.0.0/16 --region $REGION
aws ec2 authorize-security-group-ingress --group-id $OBS_SG --protocol tcp --port 3100 --cidr 10.0.0.0/16 --region $REGION

# Allow Observability to scrape App metrics
aws ec2 authorize-security-group-ingress --group-id $APP_SG --protocol tcp --port 3000 --source-group $OBS_SG --region $REGION

echo "✅ Security Groups created!"
echo "ALB SG: $ALB_SG"
echo "APP SG: $APP_SG"
echo "OBS SG: $OBS_SG"
