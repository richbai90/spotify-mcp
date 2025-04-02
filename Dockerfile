FROM node:20-slim AS builder

WORKDIR /app

COPY src/spotify /app
COPY tsconfig.json /tsconfig.json

RUN npm install

RUN npm run build

FROM node:20-slim AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "/app/dist/index.js"]
