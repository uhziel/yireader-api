/// <reference lib="DOM" />
import * as express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {URL} from 'url';
import bookSourceMgr from './BookSourceMgr';
import {BookSource} from './BookSourceMgr';

const app: express.Application = express();

app.use(express.json());
app.use(express.static('dist'));

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

interface ReplaceExp {
  old: string;
  new: string;
}

interface BsExp {
  selector: string;
  replace: ReplaceExp | null;
  attr: string | null;
  match: string | null;
}

function genBsExp(exp: string): BsExp {
  const partsExp = exp.split('@');
  const result: BsExp = {
    selector: partsExp[0],
    replace: null,
    attr: null,
    match: null,
  };
  for (let index = 1; index < partsExp.length; index++) {
    const operatorExp = partsExp[index];
    if (operatorExp.length === 0) {
      continue;
    }

    const parts = operatorExp.split('->');
    if (parts[0] === 'replace') {
      if (parts.length === 3) {
        result.replace = {
          old: parts[1],
          new: parts[2],
        };
      }
    } else if (parts[0] === 'attr') {
      if (parts.length === 2) {
        result.attr = parts[1];
      }
    } else if (parts[0] === 'match') {
      if (parts.length === 2) {
        result.match = parts[1];
      }
    }
  }
  return result;
}

function select(
  $parent: cheerio.Cheerio | cheerio.Root,
  selector: string
): cheerio.Cheerio {
  if ('find' in $parent) {
    return $parent.find(selector);
  } else {
    return $parent(selector);
  }
}

/**
 * 从 dom 中提取出文本
 */
function extractData(
  $parent: cheerio.Cheerio | cheerio.Root,
  exp: string,
  type: string
): string {
  const bsExp = genBsExp(exp);
  let tmp = '';
  if (bsExp.attr) {
    const res = select($parent, bsExp.selector).attr(bsExp.attr);
    if (res) {
      tmp = res;
    }
  } else if (type === 'text') {
    tmp = select($parent, bsExp.selector).text();
  } else if (type === 'href') {
    const res = select($parent, bsExp.selector).attr('href');
    if (res) {
      tmp = res;
    }
  } else if (type === 'src') {
    const res = select($parent, bsExp.selector).attr('src');
    if (res) {
      tmp = res;
    }
  }

  if (bsExp.replace) {
    tmp = tmp.replace(bsExp.replace.old, bsExp.replace.new);
  } else if (bsExp.match) {
    const matchRes = tmp.match(bsExp.match);
    if (matchRes) {
      tmp = matchRes[0];
    }
  }
  tmp = tmp.trim();
  return tmp;
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

app.get('/search', (req, res, next) => {
  handleSearch(req, res).catch(next);
});

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

app.post('/detail', async (req, res, next) => {
  handleDetail(req, res).catch(next);
});

interface CatalogEntry {
  name: string;
  url: string;
  useLevel: boolean;
}

function clearRepeatlyCatalogEntry(catalog: CatalogEntry[]): CatalogEntry[] {
  let repeatlyIndex = 0;
  for (let index = 0; index < catalog.length; index++) {
    if (catalog[index].name === catalog[catalog.length - 1 - index].name) {
      repeatlyIndex = index;
    } else {
      break;
    }
  }
  return catalog.slice(repeatlyIndex + 1);
}

function fillCatalogResult(
  bookSource: BookSource,
  catalogResult: CatalogEntry[],
  $iterator: cheerio.Cheerio,
  catalogURLOrigin: string
) {
  const entry = {name: '', url: '', useLevel: false};
  entry.name = extractData($iterator, bookSource.catalog.name, 'text');
  let attrSrc = extractData($iterator, bookSource.catalog.chapter, 'href');
  if (attrSrc.length === 0) {
    return;
  } else {
    if (attrSrc.indexOf('/') === 0) {
      attrSrc = catalogURLOrigin + attrSrc;
    }
    entry.url = attrSrc;
  }
  catalogResult.push(entry);
}

async function handleCatalog(req: express.Request, res: express.Response) {
  const reqData = req.body;
  const response = await axios.get(reqData['catalog']);
  const $ = cheerio.load(response.data);
  let catalogResult: CatalogEntry[] = [];
  const catalogURL = new URL(reqData['catalog']);
  const bookSource = bookSourceMgr.getBookSource(catalogURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }
  for (const iterator of $(bookSource.catalog.list).toArray()) {
    const $iterator = $(iterator);
    if (bookSource.catalog.booklet) {
      for (const iterator2 of $iterator
        .find(bookSource.catalog.booklet.list)
        .toArray()) {
        const $iterator2 = $(iterator2);
        fillCatalogResult(
          bookSource,
          catalogResult,
          $iterator2,
          catalogURL.origin
        );
      }
    } else {
      fillCatalogResult(
        bookSource,
        catalogResult,
        $iterator,
        catalogURL.origin
      );
    }
  }
  catalogResult = clearRepeatlyCatalogEntry(catalogResult);
  res.json(catalogResult);
}

app.post('/catalog', async (req, res, next) => {
  handleCatalog(req, res).catch(next);
});

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

app.post('/chapter', async (req, res, next) => {
  handleChapter(req, res).catch(next);
});

app.listen(3000, () => {
  console.log('Listen on port 3000!');
});
