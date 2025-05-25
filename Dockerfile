FROM node:20-slim

WORKDIR /app

# Copy the standalone build (which now includes static files in the right place)
COPY .next-do/standalone ./

# Copy public files
COPY public ./public

# Ensure files are properly accessible
RUN chmod -R 755 /app/public

# Set environment variables
ENV NODE_ENV production
ENV PORT 8080

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
