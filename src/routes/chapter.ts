import * as express from 'express';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {isReqDataChapter, parseChapter} from '../BookSourceParser';

const router = express.Router();

async function handleChapter(req: express.Request, res: express.Response) {
  const reqData = req.body;
  if (!isReqDataChapter(reqData)) {
    res.status(400).send('Bad Request');
    return;
  }
  const chapterURL = new URL(reqData.url);
  const bookSource = bookSourceMgr.getBookSource(chapterURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }

  const result = await parseChapter(bookSource, reqData);
  res.json(result);
}

router.post('/', (req, res, next) => {
  handleChapter(req, res).catch(next);
});

export default router;
