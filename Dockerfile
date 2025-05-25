FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build:fixed-do

# Copy standalone build to root
RUN cp -r .next/standalone/* . && \
    cp -r .next/static ./.next/static && \
    mkdir -p public && cp -r public .

# Set environment variables
ENV NODE_ENV production
ENV PORT 8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]