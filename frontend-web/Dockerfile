# Stage 1: Build the frontend application
FROM node:24-alpine AS build
# Set the working directory inside the container
WORKDIR /app
# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./
# Install dependencies
RUN npm ci
# Copy the rest of the application code
COPY . .
# Accept the API URL as a build argument
ARG VITE_API_URL
# Make the API URL visible to Vite, which bakes it into the bundle at build time
ENV VITE_API_URL=$VITE_API_URL
# Run the build command
RUN npm run build

# Stage 2: Serve the built frontend application with Caddy
FROM caddy:2-alpine
# Copy the built frontend application into Caddy's web root
COPY --from=build /app/dist /srv
# Copy the Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile