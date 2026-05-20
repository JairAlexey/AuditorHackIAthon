FROM node:22-alpine

# Habilitar pnpm via corepack (incluido en Node 16.9+)
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 5173

# --host expone el servidor a la red del contenedor
CMD ["pnpm", "dev", "--host"]
