FROM node:22.16-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY web ./web
EXPOSE 3000
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DB_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app
USER node
CMD ["node", "server/index.js"]
