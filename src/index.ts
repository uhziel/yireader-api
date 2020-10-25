/// <reference lib="DOM" />
import * as express from 'express';

import searchRouter from './routes/search';
import detailRouter from './routes/detail';
import catalogRouter from './routes/catalog';
import chapterRouter from './routes/chapter';

const app: express.Application = express();

app.use(express.json());
app.use(express.static('dist'));

app.use('/search', searchRouter);
app.use('/detail', detailRouter);
app.use('/catalog', catalogRouter);
app.use('/chapter', chapterRouter);

app.listen(3000, () => {
  console.log('Listen on port 3000!');
});
