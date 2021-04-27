/// <reference lib="DOM" />

// dotenv
import {config as dotenvConfig} from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

// mongodb
const MONGODB_URI = process.env.MONGODB_URI;
import {
  connect as connectMongodb,
  connection as connectionMonogodb,
  set as setMongooseOptions,
} from 'mongoose';
if (!MONGODB_URI) {
  console.error('Please config your env MONGODB_URI first.');
} else {
  connectMongodb(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log(`Connected to ${MONGODB_URI}`))
    .catch(e => {
      console.error(e);
    });
  if (process.env.NODE_ENV !== 'production') {
    setMongooseOptions('debug', true);
  }
}

import express from 'express';
import jwt from './middlewares/jwt';

import searchRouter from './routes/search';
import detailRouter from './routes/detail';
import catalogRouter from './routes/catalog';
import chapterRouter from './routes/chapter';
import graphqlRouter from './routes/graphql';
import statusRouter from './routes/status';
import webresourceRouter from './routes/webresource';
import inkRouter from './routes/ink';

import usersRouter from './routes/users';

const app: express.Application = express();

app.disable('x-powered-by');

// view engine setup: ejs
app.set('views', 'assets/views');
app.set('view engine', 'ejs');
app.set('view options', {compileDebug: false, debug: true, strict: false});

import serverTiming from 'server-timing';
app.use(serverTiming());

app.use(express.json());

const fingerprintRegExp = /\.[0-9a-f]{8}\./;
app.use(
  express.static('dist', {
    setHeaders: (res, path) => {
      if (fingerprintRegExp.test(path)) {
        res.set('Cache-Control', 'max-age=31536000'); //1年有效期
      }
    },
  })
);

app.use('/search', searchRouter);
app.use('/detail', detailRouter);
app.use('/catalog', catalogRouter);
app.use('/chapter', chapterRouter);
app.use('/users', usersRouter);
app.use('/graphql', jwt, graphqlRouter);
app.use('/status', statusRouter);
app.use('/webresource', webresourceRouter);
app.use('/ink', inkRouter);

console.log(`This process is pid ${process.pid}`);
const server = app.listen(3001, () => {
  console.log('Listen on port 3001!');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing the application');
  server.close(() => {
    console.log('yireader server closed');
    connectionMonogodb.close(() => console.log('Monogodb connection closed'));
  });
});
