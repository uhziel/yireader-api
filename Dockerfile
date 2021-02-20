FROM node:12-alpine as build-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run compile

FROM node:12-alpine as production-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY assets ./assets
COPY --from=build-stage /app/build ./build
EXPOSE 3001
CMD ["node", "--unhandled-rejections=strict", "/app/build/src/index.js"]
