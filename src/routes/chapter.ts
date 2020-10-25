import * as express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {BookSource} from '../BookSourceMgr';

const router = express.Router();

function needPurify(bookSource: BookSource, text: string): boolean {
  if (!(bookSource.chapter.purify instanceof Array)) {
    return false;
  }

  for (const regExpStr of bookSource.chapter.purify) {
    const r = new RegExp(`^${regExpStr}$`);
    if (r.test(text)) {
      return true;
    }
  }

  return false;
}

function fillAllP(bookSource: BookSource, allP: string[], text: string) {
  if (needPurify(bookSource, text)) {
    return;
  }
  allP.push(text);
}

async function handleChapter(req: express.Request, res: express.Response) {
  const reqData = req.body;
  const response = await axios.get(reqData['url']);
  const chapterURL = new URL(reqData['url']);
  const bookSource = bookSourceMgr.getBookSource(chapterURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }
  const $ = cheerio.load(response.data);
  const allP: string[] = [];
  const chapterResult = {
    content: '',
  };

  for (const iterator of $(bookSource.chapter.content).toArray()) {
    const text = $(iterator).text();
    if (text.indexOf('    ') !== -1) {
      for (const subText of text.split('    ')) {
        if (subText.length === 0) {
          continue;
        }
        fillAllP(bookSource, allP, subText);
      }
    } else {
      fillAllP(bookSource, allP, text);
    }
  }
  chapterResult.content = allP.join('\n');
  res.json(chapterResult);
}

router.post('/', (req, res, next) => {
  handleChapter(req, res).catch(next);
});

export default router;
