FROM node:12-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY jueshitangmen.info.json tsconfig.json ./
COPY src ./src
RUN npx tsc
EXPOSE 3000
CMD ["node", "/app/build/src/index.js"]