FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })"

CMD ["node", "src/index.js"]
