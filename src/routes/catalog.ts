import * as express from 'express';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {isReqDataCatalog, parseCatalog} from '../BookSourceParser';

const router = express.Router();

async function handleCatalog(req: express.Request, res: express.Response) {
  const reqData = req.body;
  if (!isReqDataCatalog(reqData)) {
    res.status(400).send('Bad Request');
    return;
  }
  const catalogURL = new URL(reqData.catalog);
  const bookSource = bookSourceMgr.getBookSource(catalogURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }
  const result = await parseCatalog(bookSource, reqData);
  res.json(result);
}

router.post('/', (req, res, next) => {
  handleCatalog(req, res).catch(next);
});

export default router;
