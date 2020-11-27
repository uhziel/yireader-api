FROM node:12-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY book_sources ./book_sources
COPY src ./src
RUN npx tsc
EXPOSE 3001
CMD ["node", "/app/build/src/index.js"]