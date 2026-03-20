FROM node:22-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install --production=false

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 8081
CMD ["node", "dist/index.js"]
