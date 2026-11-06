FROM node:24-alpine
WORKDIR /app
COPY lib/server ./lib/server
COPY server-node ./server-node
RUN mkdir /data && chown node:node /data && chmod 700 /data
USER node
ENV HOST=0.0.0.0 PORT=3001 SHARIKU_SQLITE_PATH=/data/shariku.sqlite
EXPOSE 3001
CMD ["node", "server-node/start.mjs"]
