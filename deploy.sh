#!/bin/bash

# One-time EC2 bootstrap. Run manually once over SSH after first launch:
#   ssh -i key.pem ec2-user@<EC2_HOST> 'bash -s' < deploy.sh
# Ongoing deploys are fully automated via GitHub Actions (ci-cd.yml).

set -e

# 1. Update packages and install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install docker -y
    sudo service docker start
    sudo usermod -a -G docker ec2-user
    # Install docker compose plugin
    sudo yum install docker-compose-plugin -y
    echo "NOTE: log out and back in for the docker group to apply."
else
    echo "Docker is already installed."
fi

# 2. Prepare deploy directory
mkdir -p ~/weather-app

# 3. Require .env (docker-compose-prod.yml is delivered by the CI/CD pipeline)
if [ ! -f ~/weather-app/.env ]; then
    echo "WARNING: ~/weather-app/.env not found."
    echo "Create it before the first pipeline deploy:"
    echo "  MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/app"
    echo "  PORT=3000"
fi

echo "Bootstrap complete."
echo "Next one-time steps (outside this server):"
echo "  1. Attach an Elastic IP and allowlist it in MongoDB Atlas Network Access."
echo "  2. Add the Elastic IP to Google OAuth 'Authorized JavaScript origins'."
echo "  3. Add GitHub Secrets: EC2_HOST, EC2_SSH_KEY, DOCKERHUB_USERNAME, DOCKERHUB_TOKEN."
echo "  4. Merge to main - GitHub Actions builds, pushes and deploys the containers."
