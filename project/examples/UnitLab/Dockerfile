FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node server.js convert.js package.json ./
COPY --chown=node:node public ./public
USER node
EXPOSE 3001
CMD ["node", "server.js"]
