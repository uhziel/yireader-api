FROM node:14-alpine as build-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:14-alpine as production-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY dist ./dist
COPY assets ./assets
COPY --from=build-stage /app/build ./build
EXPOSE 3001
CMD ["node", "--unhandled-rejections=strict", "/app/build/src/index.js"]
