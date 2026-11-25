FROM node:22.16-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY web ./web
EXPOSE 3000
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DB_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => { if(!r.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "server/index.js"]
