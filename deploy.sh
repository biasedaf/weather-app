#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment setup..."

# 1. Update packages and install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install docker -y
    sudo service docker start
    sudo usermod -a -G docker ec2-user
    # Install docker-compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker is already installed."
fi

# 2. Clone the repository
REPO_URL="https://github.com/biasedaf/weather-app.git"
CLONE_DIR="weather-app"

if [ -d "$CLONE_DIR" ]; then
    echo "Directory $CLONE_DIR already exists. Pulling latest changes..."
    cd $CLONE_DIR
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO_URL $CLONE_DIR
    cd $CLONE_DIR
fi

# 3. Start the containers
echo "Starting containers with docker-compose..."
docker-compose up --build -d

echo "Deployment complete! Your app should be running on Port 80."
