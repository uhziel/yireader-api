/// <reference lib="DOM" />
import * as express from 'express';

import searchRouter from './routes/search';
import detailRouter from './routes/detail';
import catalogRouter from './routes/catalog';
import chapterRouter from './routes/chapter';
import bookSourcesRouter from './routes/bookSources';

const app: express.Application = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(express.static('dist'));

app.use('/search', searchRouter);
app.use('/detail', detailRouter);
app.use('/catalog', catalogRouter);
app.use('/chapter', chapterRouter);
app.use('/booksources', bookSourcesRouter);

app.listen(3001, () => {
  console.log('Listen on port 3001!');
});
