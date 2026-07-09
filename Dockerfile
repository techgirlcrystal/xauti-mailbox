FROM node:22.13.0-slim

WORKDIR /app

COPY . .

# Build the frontend
WORKDIR /app/frontend
RUN npm ci
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN npm run build

# Install API server deps
WORKDIR /app/api-server
RUN npm ci --omit=dev

ENV PORT=3001
EXPOSE 3001

CMD ["node", "index.js"]
