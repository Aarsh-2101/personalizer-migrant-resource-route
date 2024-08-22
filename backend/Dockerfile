# Use a node image with alpine for a small footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./

RUN npm install

# Copy the rest of the application
COPY . .

# Expose the backend port
EXPOSE 4000

# Run the app
CMD ["npx", "nodemon", "index.js"] 
