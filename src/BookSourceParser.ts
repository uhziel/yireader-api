import * as cheerio from 'cheerio';
import axios from 'axios';
import {URL} from 'url';
import {BookSource} from './BookSourceMgr';
import {extractData} from './utils';

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

export async function parseSearch(bookSource: BookSource, searchKey: string) {
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

////////////////////////////////
interface ReqDataDetail {
  name?: string;
  author?: string;
  summary?: string;
  cover?: string;
  detail: string;
}

export function isReqDataDetail(reqData: unknown): reqData is ReqDataDetail {
  return (reqData as ReqDataDetail).detail !== undefined;
}

export async function parseDetail(
  bookSource: BookSource,
  reqData: ReqDataDetail
) {
  const response = await axios.get(reqData.detail);
  const $ = cheerio.load(response.data);
  const detailURL = new URL(reqData.detail);

  const detailResult = {
    author: '',
    catalog: '',
    cover: '',
    lastChapter: '',
    name: '',
    status: '',
    summary: '',
    update: '',
  };

  if (reqData.name) {
    detailResult.name = reqData.name;
  } else if (bookSource.detail.name) {
    detailResult.name = extractData($, bookSource.detail.name, 'text');
  }
  if (reqData.author) {
    detailResult.author = reqData.author;
  } else if (bookSource.detail.author) {
    detailResult.author = extractData($, bookSource.detail.author, 'text');
  }
  if (reqData.cover) {
    detailResult.cover = reqData.cover;
  } else if (bookSource.detail.cover) {
    detailResult.cover = extractData($, bookSource.detail.cover, 'src');
  }
  if (reqData.summary) {
    detailResult.summary = reqData.summary;
  } else if (bookSource.detail.summary) {
    detailResult.summary = extractData($, bookSource.detail.summary, 'text');
  }
  if (bookSource.detail.status) {
    detailResult.status = extractData($, bookSource.detail.status, 'text');
  }
  if (bookSource.detail.update) {
    detailResult.update = extractData($, bookSource.detail.update, 'text');
  }
  if (bookSource.detail.lastChapter) {
    detailResult.lastChapter = extractData(
      $,
      bookSource.detail.lastChapter,
      'text'
    );
  }
  if (bookSource.detail.catalog) {
    detailResult.catalog = extractData($, bookSource.detail.catalog, 'href');
    if (detailResult.catalog.indexOf('/') === 0) {
      detailResult.catalog = detailURL.origin + detailResult.catalog;
    }
  } else {
    detailResult.catalog = reqData.detail;
  }

  return detailResult;
}

////////////////////////////////
interface ReqDataCatalog {
  author: string;
  catalog: string;
  cover: string;
  lastChapter: string;
  name: string;
  status: string;
  summary: string;
  update: string;
}

export function isReqDataCatalog(reqData: unknown): reqData is ReqDataCatalog {
  return (reqData as ReqDataCatalog).catalog !== undefined;
}

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

export async function parseCatalog(
  bookSource: BookSource,
  reqData: ReqDataCatalog
) {
  const response = await axios.get(reqData.catalog);
  const $ = cheerio.load(response.data);
  let catalogResult: CatalogEntry[] = [];
  const catalogURL = new URL(reqData.catalog);
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
  return catalogResult;
}

////////////////////////////////
interface ReqDataChapter {
  name: string;
  url: string;
  useLevel: boolean;
}

export function isReqDataChapter(reqData: unknown): reqData is ReqDataChapter {
  return (reqData as ReqDataChapter).url !== undefined;
}

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

export async function parseChapter(
  bookSource: BookSource,
  reqData: ReqDataChapter
) {
  const response = await axios.get(reqData.url);
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
  return chapterResult;
}
