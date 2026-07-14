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

echo "Ensuring swap space exists to prevent OOM kills during pip install..."
if ! sudo swapon --show | grep -q "/swapfile"; then
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
fi
free -h

echo "Removing old virtual environment..."
rm -rf .venv

echo "Creating virtual environment..."
python3 -m venv .venv

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing Python dependencies (memory-safe mode)..."
pip install --no-cache-dir --no-compile -r requirements.txt

echo "Backend dependencies installed successfully."