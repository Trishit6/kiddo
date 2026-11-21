FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile

CMD ["pnpm", "--filter", "@reel/api", "dev:worker"]
