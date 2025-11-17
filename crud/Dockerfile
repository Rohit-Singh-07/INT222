# Use official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and pnpm lock
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy the rest of the source code
COPY . .

# Build TypeScript
RUN pnpm run build

# Expose port
EXPOSE 5000

# Run the server
CMD ["node", "dist/server.js"]
