FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node server.js store.js package.json ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
