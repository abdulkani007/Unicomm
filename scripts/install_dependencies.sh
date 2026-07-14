#!/bin/bash

set -e

echo "Updating Amazon Linux..."

sudo dnf update -y

echo "Installing required packages..."

sudo dnf install -y python3 python3-pip git

echo "Changing to backend directory..."

cd /home/ec2-user/unicomm/backend

echo "Correcting permissions..."

sudo chown -R ec2-user:ec2-user /home/ec2-user/unicomm

echo "Removing old virtual environment..."

rm -rf .venv

echo "Creating virtual environment..."

python3 -m venv .venv

echo "Activating virtual environment..."

source .venv/bin/activate

echo "Upgrading pip..."

pip install --upgrade pip

echo "Installing Python dependencies..."

pip install -r requirements.txt

echo "Backend dependencies installed successfully."
