/// <reference lib="DOM" />

// dotenv
import {config as dotenvConfig} from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

// mongodb
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Please config your env MONGODB_URI first.');
}
import {
  connect as connectMongodb,
  connection as connectionMonogodb,
  set as setMongooseOptions,
} from 'mongoose';
connectMongodb(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log(`Connected to ${MONGODB_URI}`))
  .catch(e => {
    throw new Error(e);
  });
if (process.env.NODE_ENV !== 'production') {
  setMongooseOptions('debug', true);
}

import express from 'express';
import jwt from './middlewares/jwt';

import searchRouter from './routes/search';
import detailRouter from './routes/detail';
import catalogRouter from './routes/catalog';
import chapterRouter from './routes/chapter';
import graphqlRouter from './routes/graphql';
import versionRouter from './routes/version';

import usersRouter from './routes/users';

const app: express.Application = express();

app.disable('x-powered-by');

import serverTiming from 'server-timing';
app.use(serverTiming());

app.use(express.json());
app.use(express.static('dist'));

app.use('/search', searchRouter);
app.use('/detail', detailRouter);
app.use('/catalog', catalogRouter);
app.use('/chapter', chapterRouter);
app.use('/users', usersRouter);
app.use('/graphql', jwt, graphqlRouter);
app.use('/version', versionRouter);

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
