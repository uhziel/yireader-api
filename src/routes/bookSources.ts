import * as express from 'express';
import bookSourceMgr from '../BookSourceMgr';

const router = express.Router();

interface BookSourceSimpleInfo {
  name: string;
  url: string;
}

router.get('/', (req, res) => {
  const bookSources = bookSourceMgr.getAllBookSources();
  const bookSourceList: BookSourceSimpleInfo[] = [];
  for (const bookSource of bookSources) {
    const info: BookSourceSimpleInfo = {
      name: bookSource.name,
      url: bookSource.url,
    };
    bookSourceList.push(info);
  }
  res.json(bookSourceList);
});

export default router;
