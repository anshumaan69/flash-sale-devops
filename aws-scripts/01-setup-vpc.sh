#!/bin/bash
# AWS CLI script to set up High Availability Multi-AZ Network Topology
set -e

REGION="ap-south-1"
VPC_CIDR="10.0.0.0/16"

echo "Creating VPC in $REGION..."
VPC_ID=$(aws ec2 create-vpc --cidr-block $VPC_CIDR --region $REGION --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=ha-webstack-vpc --region $REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames '{"Value": true}' --region $REGION

echo "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway --region $REGION --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $REGION

echo "Creating Public Subnets..."
PUB_A=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${REGION}a --region $REGION --query 'Subnet.SubnetId' --output text)
PUB_B=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${REGION}b --region $REGION --query 'Subnet.SubnetId' --output text)

echo "Creating Private Subnets..."
PRIV_APP_A=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.13.0/24 --availability-zone ${REGION}a --region $REGION --query 'Subnet.SubnetId' --output text)
PRIV_APP_B=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.14.0/24 --availability-zone ${REGION}b --region $REGION --query 'Subnet.SubnetId' --output text)
PRIV_OBS=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.20.0/24 --availability-zone ${REGION}a --region $REGION --query 'Subnet.SubnetId' --output text)

echo "Setting up Public Route Table..."
PUB_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID --region $REGION --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $PUB_RT --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $REGION
aws ec2 associate-route-table --subnet-id $PUB_A --route-table-id $PUB_RT --region $REGION
aws ec2 associate-route-table --subnet-id $PUB_B --route-table-id $PUB_RT --region $REGION

echo "✅ VPC Setup Completed! VPC ID: $VPC_ID"
