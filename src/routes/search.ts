import * as express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {BookSource} from '../BookSourceMgr';
import {extractData} from '../utils';

const router = express.Router();
function getSearchUrlStr(url: string): string {
  const postIndex = url.indexOf('@post->');
  if (postIndex === -1) {
    return url;
  } else {
    return url.slice(0, postIndex);
  }
}

const operatorPost = '@post->';
async function makeSearchReq(url: string, searchKey: string) {
  const postIndex = url.indexOf(operatorPost);
  if (postIndex === -1) {
    const searchUrlStr: string = url.replace('${key}', searchKey);
    return axios.get(encodeURI(searchUrlStr));
  } else {
    const searchUrlStr = url.slice(0, postIndex);
    const data = url
      .slice(postIndex + operatorPost.length)
      .replace('${key}', searchKey);
    return axios.post(searchUrlStr, data);
  }
}

async function searchOneBookSource(bookSource: BookSource, searchKey: string) {
  const searchUrlStr = getSearchUrlStr(bookSource.search.url);
  const response = await makeSearchReq(bookSource.search.url, searchKey);

  const $ = cheerio.load(response.data);
  const searchResult = [];
  for (const iterator of $(bookSource.search.list).toArray()) {
    const $iterator = $(iterator);
    const entry = {name: '', author: '', summary: '', cover: '', detail: ''};
    entry.name = extractData($iterator, bookSource.search.name, 'text');
    if (bookSource.search.author) {
      entry.author = extractData($iterator, bookSource.search.author, 'text');
    }
    if (bookSource.search.summary) {
      entry.summary = extractData($iterator, bookSource.search.summary, 'text');
    }
    if (bookSource.search.cover) {
      const attrCover = extractData($iterator, bookSource.search.cover, 'src');
      if (attrCover.length === 0) {
        continue;
      } else {
        entry.cover = attrCover;
      }
    }
    let attrDetail = extractData($iterator, bookSource.search.detail, 'href');
    if (attrDetail.length === 0) {
      continue;
    } else {
      if (attrDetail.indexOf('/') === 0) {
        const searchURL = new URL(searchUrlStr);
        attrDetail = searchURL.origin + attrDetail;
      }
      entry.detail = attrDetail;
    }
    searchResult.push(entry);
  }
  return searchResult;
}

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
    searchOneBookSource(bookSource, searchKey)
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
