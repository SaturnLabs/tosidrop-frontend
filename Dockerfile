FROM node:16 AS base

FROM base AS builder
WORKDIR /code/client
COPY client .
RUN npm run build
WORKDIR /code/server
COPY server .
RUN npm run build

FROM base AS final
WORKDIR /app
COPY --from=builder /code/server/index.ts /code/server/package.json /code/server/tsconfig.json ./server/
COPY --from=builder /code/server/utils ./server/utils/
COPY --from=builder /code/server/public ./server/public/
COPY --from=builder /code/server/node_modules ./server/node_modules/
COPY --from=builder /code/client/src/entities/ ./client/src/entities/
COPY --from=builder /code/client/src/services/ ./client/src/services/
COPY --from=builder /code/client/build/ ./client/build/
COPY --chmod=555 docker-entrypoint.sh .
ENTRYPOINT ["/app/docker-entrypoint.sh"]
