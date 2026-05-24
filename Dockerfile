FROM node:24-slim

WORKDIR /app

RUN npm install -g pnpm

COPY . .

RUN pnpm install

RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

CMD ["node", "artifacts/api-server/dist/index.mjs"]
