FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

# IN_DOCKER=1 and PORT=9100 are provided in compose. Default = passthrough болванка;
# participants add compaction in src/index.ts, then `npm run proxy:rebuild`. (COMPACT=1 = reference solution.)
CMD ["npm", "start"]
