# 1. Install dependencies only when needed 
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* ./
RUN \
    if [ -f yarn.lock ]; then yarn; \
    elif [ -f package-lock.json ]; then npm ci; \
    else echo "Lockfile not found." && exit 1; \
    fi

COPY . .
# This will do the trick, use the corresponding env file for each environment.
# COPY .env.production.sample .env.production
RUN yarn build

# 3. Install dependencies production only
FROM node:18-alpine AS prod_deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* ./
RUN \
    if [ -f yarn.lock ]; then yarn --prod; \
    elif [ -f package-lock.json ]; then npm install -omit=dev; \
    else echo "Lockfile not found." && exit 1; \
    fi

# 3. Production image, copy all the files and run next
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/astro.config.mjs ./astro.config.mjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=prod_deps /app/node_modules ./node_modules

RUN chown -R 1001:1001 /app
RUN chmod 755 /app

USER 1001

CMD ["yarn", "start-prod"]
