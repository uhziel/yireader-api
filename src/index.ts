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
import {connect as connectMongodb} from 'mongoose';
connectMongodb(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log(`Connected to ${MONGODB_URI}`))
  .catch(e => {
    throw new Error(e);
  });

import * as express from 'express';

import searchRouter from './routes/search';
import detailRouter from './routes/detail';
import catalogRouter from './routes/catalog';
import chapterRouter from './routes/chapter';
import bookSourcesRouter from './routes/bookSources';
import graphqlRouter from './routes/graphql';

import usersRouter from './routes/users';

const app: express.Application = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(express.static('dist'));

app.use((req, res, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tmpreq: any = req;
  const user = {
    id: '5ff9cbbd41703a3b6750fc18',
    username: 'user101',
  };
  tmpreq.user = user;
  next();
});

app.use('/search', searchRouter);
app.use('/detail', detailRouter);
app.use('/catalog', catalogRouter);
app.use('/chapter', chapterRouter);
app.use('/booksources', bookSourcesRouter);
app.use('/users', usersRouter);
app.use('/graphql', graphqlRouter);

app.listen(3001, () => {
  console.log('Listen on port 3001!');
});
