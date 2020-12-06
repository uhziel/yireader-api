import * as express from 'express';
import bookSourceMgr from '../BookSourceMgr';
import {parseSearch} from '../BookSourceParser';

const router = express.Router();

async function handleSearch(req: express.Request, res: express.Response) {
  const q = req.query;
  let searchKey = '';
  if (typeof q['key'] === 'string') {
    searchKey = q['key'];
  } else {
    res.status(400).send('Bad Request');
    return;
  }
  const searchResult = [];
  const bookSources = bookSourceMgr.getAllBookSources();
  const promises = bookSources.map(bookSource =>
    parseSearch(bookSource, searchKey)
  );
  for (const promise of promises) {
    const res = await promise;
    searchResult.push(...res);
  }

  res.json(searchResult);
}

router.get('/', (req, res, next) => {
  handleSearch(req, res).catch(next);
});

export default router;
