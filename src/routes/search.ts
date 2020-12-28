import * as express from 'express';
import bookSourceMgr from '../BookSourceMgr';
import {parseSearch} from '../BookSourceParser';

const router = express.Router();

async function handleSearch(req: express.Request, res: express.Response) {
  const q = req.query;
  const reqData = req.body;
  let searchKey = '';
  if (typeof q['key'] === 'string') {
    searchKey = q['key'];
  } else {
    res.status(400).send('Bad Request');
    return;
  }
  const searchResult = [];
  const bookSources = bookSourceMgr.getEnabledBookSources(
    reqData['enabledUrls']
  );
  const promises = bookSources.map(bookSource =>
    parseSearch(bookSource, searchKey)
  );
  for (const promise of promises) {
    try {
      const res = await promise;
      searchResult.push(...res);
    } catch (e) {
      console.error(e);
    }
  }

  res.json(searchResult);
}

router.post('/', (req, res, next) => {
  handleSearch(req, res).catch(next);
});

export default router;
