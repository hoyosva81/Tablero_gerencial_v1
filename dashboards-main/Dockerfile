FROM node:22-alpine AS production

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# System dependencies
RUN apk add --no-cache build-base python3 git

# Install Node dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build-time variables (baked into the Vite bundle at build time)
ARG VITE_API_BASE_URL
ARG VITE_STRAPI_URL
ARG VITE_BASE_URL=/dashboards/
ARG VITE_ENVIRONMENT=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STRAPI_URL=$VITE_STRAPI_URL
ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV NODE_ENV=production

# Build the application
RUN pnpm build

EXPOSE 5174

CMD ["pnpm", "preview"]
