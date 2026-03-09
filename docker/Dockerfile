FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/
COPY tsconfig.base.json ./
RUN pnpm --filter @auditkit/shared build && pnpm --filter @auditkit/api build
RUN pnpm --filter @auditkit/api deploy --prod /app/deployed

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/deployed ./
COPY --from=builder /app/packages/shared/dist ./node_modules/@auditkit/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@auditkit/shared/package.json

EXPOSE 3001
CMD ["node", "dist/index.js"]
