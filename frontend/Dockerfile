# Use a node image with alpine for a small footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./

RUN npm install

# Copy the rest of the application
COPY . .

# Expose the frontend port (default for Vite)
EXPOSE 5173

# Run the app
CMD ["npm", "run", "dev", "--", "--host"]

