# Full-Stack Weather App

This is a production-ready, multi-container Weather Application setup utilizing Docker and Docker Compose. It features an isolated Node.js backend and an Nginx-served frontend, operating securely via reverse proxy.

## Architecture
- **Frontend Container**: Runs `nginx:alpine`, serves the static HTML/CSS/JS, and acts as a reverse proxy for all `/api/` traffic.
- **Backend Container**: Runs a Node.js Express server to handle API logic, user authentication, and database interactions.
- **Database**: MongoDB (external, configured via `MONGO_URI`).

## How to Run

You can deploy this application anywhere using Docker Compose.

### Prerequisites
- Docker
- Docker Compose

### Setup Instructions

1. **Clone or Download the `docker-compose.yml` file.**
   If you are pulling images directly from Docker Hub, you just need the `docker-compose.yml` file.

2. **Create your `.env` file**
   In the same directory as your `docker-compose.yml`, create a file named `.env` and configure your MongoDB connection string and any other required secrets.
   
   Example `.env`:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/myWeatherApp?retryWrites=true&w=majority
   PORT=3000
   ```

3. **Start the Application**
   Run the following command to start both the frontend and backend containers in the background:
   ```bash
   docker-compose up -d
   ```

4. **Access the Application**
   Open your browser and navigate to `http://localhost` (or your server's IP address/domain name). The app will automatically route your frontend requests and proxy any API calls to the backend.

### Ports Used
- `80`: Frontend application & API reverse proxy.
- `3000`: Backend API (optional, can be closed to external traffic in production as Nginx proxies it internally via Docker networks).
