import * as express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {extractData} from '../utils';

const router = express.Router();

async function handleDetail(req: express.Request, res: express.Response) {
  const reqData = req.body;
  const response = await axios.get(reqData['detail']);
  const $ = cheerio.load(response.data);
  const detailURL = new URL(reqData['detail']);
  const bookSource = bookSourceMgr.getBookSource(detailURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }
  const detailResult = {
    author: '',
    catalog: '',
    cover: '',
    lastChapter: '',
    name: '',
    status: '',
    summary: '',
    update: '',
    url: '',
  };
  if (reqData.name) {
    detailResult.name = reqData.name;
  } else {
    detailResult.name = extractData($, bookSource.detail.name, 'text');
  }
  if (reqData.author) {
    detailResult.author = reqData.author;
  } else {
    detailResult.author = extractData($, bookSource.detail.author, 'text');
  }
  if (reqData.cover) {
    detailResult.cover = reqData.cover;
  } else {
    const attrCover = extractData($, bookSource.detail.cover, 'src');
    if (typeof attrCover === 'string') {
      detailResult.cover = attrCover;
    }
  }
  if (reqData.summary) {
    detailResult.summary = reqData.summary;
  } else {
    detailResult.summary = extractData($, bookSource.detail.summary, 'text');
  }
  if (bookSource.detail.status) {
    detailResult.status = extractData($, bookSource.detail.status, 'text');
  }
  if (bookSource.detail.update) {
    detailResult.update = extractData($, bookSource.detail.update, 'text');
  }
  detailResult.lastChapter = extractData(
    $,
    bookSource.detail.lastChapter,
    'text'
  );
  if (bookSource.detail.catalog) {
    detailResult.catalog = extractData($, bookSource.detail.catalog, 'href');
    if (detailResult.catalog.indexOf('/') === 0) {
      detailResult.catalog = detailURL.origin + detailResult.catalog;
    }
  } else {
    detailResult.catalog = reqData.detail;
  }

  detailResult.url = reqData.url;
  res.json(detailResult);
}

router.post('/', (req, res, next) => {
  handleDetail(req, res).catch(next);
});

export default router;
