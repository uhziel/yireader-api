/// <reference lib="DOM" />
import * as express from 'express';
import {readFileSync} from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {URL} from 'url';

const bookSource = JSON.parse(readFileSync('www.9txs.com.json', 'utf8'));
const app: express.Application = express();

app.use(express.json());
app.use(express.static('dist'));

app.get('/', (req, res) => {
  res.send('Hello world');
});

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
}

function genBsExp(exp: string): BsExp {
  const partsExp = exp.split('@');
  const result: BsExp = {
    selector: partsExp[0],
    replace: null,
    attr: null,
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
  }
  return tmp;
}

app.get('/search', async (req, res) => {
  const q = req.query;
  let searchKey = '';
  if (typeof q['key'] === 'string') {
    searchKey = q['key'];
  } else {
    res.status(400).send('Bad Request');
    return;
  }
  const searchUrlStr = getSearchUrlStr(bookSource.search.url);
  let response = null;
  try {
    response = await makeSearchReq(bookSource.search.url, searchKey);
  } catch (e) {
    console.error(e);
    res.status(500).send('url error');
    return;
  }

  const $ = cheerio.load(response.data);
  const searchResult = [];
  for (const iterator of $(bookSource.search.list).toArray()) {
    const $iterator = $(iterator);
    const entry = {name: '', author: '', summary: '', cover: '', detail: ''};
    entry.name = extractData($iterator, bookSource.search.name, 'text');
    entry.author = extractData($iterator, bookSource.search.author, 'text');
    if (bookSource.search.summary) {
      entry.summary = extractData($iterator, bookSource.search.summary, 'text');
    }
    const attrCover = extractData($iterator, bookSource.search.cover, 'src');
    if (attrCover.length === 0) {
      continue;
    } else {
      entry.cover = attrCover;
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
  res.json(searchResult);
});

//{"name":"斗罗大陆4终极斗罗","author":"唐家三少","summary":"一万年后，冰化了。斗罗联邦科考队在极北之地科考时发现了一个有着金银双色花纹的蛋，用仪器探察之后，发现里面居然有生命体征，赶忙将其带回研究所进行孵化。蛋孵化出来了，可孵出来的却是一个婴儿，和人类一模一样的婴儿，一个蛋生的孩子。...","cover":"https://img.jueshitangmen.info/27/264865.jpg","detail":"https://www.jueshitangmen.info/27/"}
app.post('/detail', async (req, res) => {
  const reqData = req.body;
  const response = await axios.get(reqData['detail']);
  const $ = cheerio.load(response.data);
  const origin = new URL(reqData['detail']).origin;
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
      detailResult.catalog = origin + detailResult.catalog;
    }
  } else {
    detailResult.catalog = reqData.detail;
  }

  detailResult.url = reqData.url;
  res.json(detailResult);
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

app.post('/catalog', async (req, res) => {
  const reqData = req.body;
  const response = await axios.get(reqData['catalog']);
  const $ = cheerio.load(response.data);
  let catalogResult: CatalogEntry[] = [];
  const catalogURL = new URL(reqData['catalog']);
  for (const iterator of $(bookSource.catalog.list).toArray()) {
    const $iterator = $(iterator);
    if (bookSource.catalog.booklet) {
      for (const iterator2 of $iterator
        .find(bookSource.catalog.booklet.list)
        .toArray()) {
        const $iterator2 = $(iterator2);
        fillCatalogResult(catalogResult, $iterator2, catalogURL.origin);
      }
    } else {
      fillCatalogResult(catalogResult, $iterator, catalogURL.origin);
    }
  }
  catalogResult = clearRepeatlyCatalogEntry(catalogResult);
  res.json(catalogResult);
});

function needPurify(text: string): boolean {
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

app.post('/chapter', async (req, res) => {
  const reqData = req.body;
  const response = await axios.get(reqData['url']);
  const $ = cheerio.load(response.data);
  const allP: string[] = [];
  const chapterResult = {
    content: '',
  };

  for (const iterator of $(bookSource.chapter.content).toArray()) {
    const text = $(iterator).text();
    if (needPurify(text)) {
      continue;
    }
    allP.push(text);
  }
  chapterResult.content = allP.join('\n');
  res.json(chapterResult);
});

app.listen(3000, () => {
  console.log('Listen on port 3000!');
});
