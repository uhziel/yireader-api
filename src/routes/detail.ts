import * as express from 'express';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {parseDetail, isReqDataDetail} from '../BookSourceParser';

const router = express.Router();

async function handleDetail(req: express.Request, res: express.Response) {
  const reqData = req.body;
  if (!isReqDataDetail(reqData)) {
    res.status(400).send('Bad Request');
    return;
  }
  const detailURL = new URL(reqData.detail);
  const bookSource = bookSourceMgr.getBookSource(detailURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }
  const result = await parseDetail(bookSource, reqData);
  res.json(result);
}

router.post('/', (req, res, next) => {
  handleDetail(req, res).catch(next);
});

export default router;
