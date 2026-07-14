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

echo "Allocating swap space to prevent out-of-memory errors on pip installs..."

if [ ! -f /swapfile ]; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab
fi

echo "Removing old virtual environment..."

rm -rf .venv

echo "Creating virtual environment..."

python3 -m venv .venv

echo "Activating virtual environment..."

source .venv/bin/activate

echo "Upgrading pip..."

pip install --no-cache-dir --upgrade pip

echo "Installing Python dependencies (using no-cache-dir to minimize memory)..."

pip install --no-cache-dir -r requirements.txt

echo "Backend dependencies installed successfully."
