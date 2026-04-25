# Use lightweight Node.js Alpine image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first for efficient layer caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the source code
COPY . .

# Expose the API port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
