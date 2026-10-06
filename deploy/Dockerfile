# One image: API + MCP + anchor loop. The static site is served by nginx from deploy/site, not from here.
FROM node:26-alpine AS build
RUN npm install -g pnpm@9.15.0
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
RUN rm -rf packages/web packages/sdk-python \
 && pnpm install --frozen-lockfile \
 && pnpm -r --filter '!@auditkit/web' build \
 && pnpm --filter @auditkit/server --prod deploy /out

FROM node:26-alpine
ENV NODE_ENV=production AUDITKIT_DATA=/data PORT=3001
WORKDIR /app
COPY --from=build /out .
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["node", "dist/main.js"]
