# Build Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Final Production Image
FROM node:20-alpine
WORKDIR /app

# Patch OS-level vulnerabilities
RUN apk update && apk upgrade --no-cache

# Copy server dependencies and install
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server code
COPY server/ ./server/

# Copy Frontend Build from previous stage
COPY --from=build-frontend /app/client/dist ./server/dist

# Security: Use non-root node user
RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "server/server.js"]
