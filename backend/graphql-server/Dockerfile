# Use Node.js base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build TypeScript
RUN npm run build

# Expose GraphQL port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
