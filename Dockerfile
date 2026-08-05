FROM node:20-alpine
WORKDIR /app

# Habilitar pnpm mediante corepack (Regla de oro del proyecto)
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate

# Copiar archivos de manifiesto y bloqueo para aprovechar la caché de capas Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar dependencias estrictamente con pnpm y lockfile congelado
RUN pnpm install --frozen-lockfile

# Copiar el código fuente del proyecto
COPY . .

# Usar usuario no root "node" por mejores prácticas de seguridad DevOps
USER node

# Exponer el puerto configurado de la API
EXPOSE 3000

CMD ["node", "src/index.js"]
