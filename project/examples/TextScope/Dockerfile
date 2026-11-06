FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node server.js tool.js package.json ./
COPY --chown=node:node public ./public
USER node
EXPOSE 3003
CMD ["node", "server.js"]
