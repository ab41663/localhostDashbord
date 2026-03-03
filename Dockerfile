# Build Frontend
FROM node:18-alpine AS build-frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build Backend
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/

# Copy Frontend Build to Backend
COPY --from=build-frontend /app/client/dist ./server/dist

EXPOSE 3001
CMD ["node", "server/server.js"]
