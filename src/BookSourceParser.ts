import axios, {AxiosRequestConfig} from 'axios';
import {BookSource} from './BookSourceMgr';
import createContentBlock, {
  ContentBlock,
  genBsExp,
  HeadersExp,
} from './ContentBlock';
import * as iconv from 'iconv-lite';
import * as urlencode from 'urlencode';

interface ContentType {
  type: string;
  charset: string;
}

function parseContentType(text: string): ContentType {
  const contentType: ContentType = {
    type: 'text/html',
    charset: 'unknown',
  };

  if (!text) {
    return contentType;
  }

  const contentParts = text.split(';');
  if (contentParts.length <= 0) {
    return contentType;
  }
  contentType.type = contentParts[0].trim().toLowerCase();
  if (contentType.type === 'application/json') {
    contentType.charset = 'utf8';
  }

  if (!contentParts[1]) {
    return contentType;
  }

  const paramParts = contentParts[1].split('=');
  if (paramParts.length !== 2) {
    return contentType;
  }

  if (paramParts[0].trim().toLowerCase() !== 'charset') {
    return contentType;
  }

  contentType.charset = paramParts[1].trim().toLowerCase();
  return contentType;
}

const axiosWithEncoding = axios.create();
axiosWithEncoding.defaults.headers.common['User-Agent'] =
  'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36';
axiosWithEncoding.interceptors.response.use(response => {
  const contentType = parseContentType(response.headers['content-type']);
  if (contentType.charset !== 'unknown') {
    response.data = iconv.decode(response.data, contentType.charset);
  } else {
    // 1024 via https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#Attributes
    const headerText = iconv.decode(response.data.slice(0, 1024), 'latin1');
    let charset = 'utf8';
    const result = headerText.match(
      /<meta.*?charset="?([-A-Za-z0-9_]+)"?.*?>/i
    );
    if (result !== null && result.length === 2) {
      charset = result[1];
    }
    response.data = iconv.decode(response.data, charset);
  }

  if (contentType.type === 'application/json' || response.data[0] === '{') {
    try {
      response.data = JSON.parse(response.data);
    } catch (e) {
      console.error(e);
    }
  }
  return response;
});

export interface ResDataSearchEntry {
  name: string;
  author: string;
  summary: string;
  cover: string;
  detail: string;
  bookSourceId?: string;
}

export type ResDataSearch = ResDataSearchEntry[];

interface BsHttpReq {
  reqUrl: string;
  postData: string | null;
  headers: HeadersExp;
}

function genBsHttpReq(url: string, searchKey?: string): BsHttpReq {
  const bsExp = genBsExp(url);
  const httpReq: BsHttpReq = {reqUrl: '', postData: null, headers: {}};

  if (bsExp.post) {
    let data: string;
    if (searchKey) {
      data = bsExp.post.replace('${key}', searchKey);
    } else {
      data = bsExp.post;
    }

    httpReq.reqUrl = bsExp.selector;
    httpReq.postData = data;
    httpReq.headers = bsExp.headers;
  } else {
    if (searchKey) {
      httpReq.reqUrl = bsExp.selector.replace('${key}', searchKey);
    } else {
      httpReq.reqUrl = bsExp.selector;
    }
    httpReq.headers = bsExp.headers;
  }

  return httpReq;
}

async function makeHttpReq(bsHttpReq: BsHttpReq) {
  const config: AxiosRequestConfig = {};
  config.headers = bsHttpReq.headers;
  config.responseType = 'arraybuffer';
  if (bsHttpReq.postData) {
    return axiosWithEncoding.post(bsHttpReq.reqUrl, bsHttpReq.postData, config);
  } else {
    return axiosWithEncoding.get(bsHttpReq.reqUrl, config);
  }
}

export async function parseSearch(
  bookSource: BookSource,
  searchKey: string
): Promise<ResDataSearch> {
  const bsHttpReq = genBsHttpReq(
    bookSource.search.url,
    urlencode(searchKey, bookSource.search.charset)
  );
  const response = await makeHttpReq(bsHttpReq);

  const searchResult: ResDataSearch = [];

  const contentBlock = createContentBlock(bsHttpReq.reqUrl, response.data);
  if (!contentBlock) {
    return searchResult;
  }

  for (const iterator of contentBlock.query(bookSource.search.list)) {
    const entry: ResDataSearchEntry = {
      name: '',
      author: '',
      summary: '',
      cover: '',
      detail: '',
    };
    entry.name = iterator.value(bookSource.search.name, 'text');
    if (bookSource.search.author) {
      entry.author = iterator.value(bookSource.search.author, 'text');
    }
    if (bookSource.search.summary) {
      entry.summary = iterator.value(bookSource.search.summary, 'text');
    }
    if (bookSource.search.cover) {
      entry.cover = iterator.value(bookSource.search.cover, 'src');
    }
    const attrDetail = iterator.value(bookSource.search.detail, 'href');
    if (attrDetail.length === 0) {
      continue;
    } else {
      entry.detail = attrDetail;
    }
    entry.bookSourceId = bookSource.id;
    searchResult.push(entry);
  }
  return searchResult;
}

////////////////////////////////
export interface ReqDataDetail {
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
  const bsHttpReq = genBsHttpReq(reqData.detail);
  const response = await makeHttpReq(bsHttpReq);

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

  const contentBlock = createContentBlock(bsHttpReq.reqUrl, response.data);
  if (!contentBlock) {
    return detailResult;
  }

  if (reqData.name) {
    detailResult.name = reqData.name;
  } else if (bookSource.detail.name) {
    detailResult.name = contentBlock.value(bookSource.detail.name, 'text');
  }
  if (reqData.author) {
    detailResult.author = reqData.author;
  } else if (bookSource.detail.author) {
    detailResult.author = contentBlock.value(bookSource.detail.author, 'text');
  }
  if (reqData.cover) {
    detailResult.cover = reqData.cover;
  } else if (bookSource.detail.cover) {
    detailResult.cover = contentBlock.value(bookSource.detail.cover, 'src');
  }
  if (reqData.summary) {
    detailResult.summary = reqData.summary;
  } else if (bookSource.detail.summary) {
    detailResult.summary = contentBlock.value(
      bookSource.detail.summary,
      'text'
    );
  }
  if (bookSource.detail.status) {
    detailResult.status = contentBlock.value(bookSource.detail.status, 'text');
  }
  if (bookSource.detail.update) {
    detailResult.update = contentBlock.value(bookSource.detail.update, 'text');
  }
  if (bookSource.detail.lastChapter) {
    detailResult.lastChapter = contentBlock.value(
      bookSource.detail.lastChapter,
      'text'
    );
  }
  if (bookSource.detail.catalog) {
    detailResult.catalog = contentBlock.value(
      bookSource.detail.catalog,
      'href'
    );
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
  let repeatlyIndex = -1;
  for (let index = 0; index < catalog.length; index++) {
    if (catalog[index].name === catalog[catalog.length - 1 - index].name) {
      repeatlyIndex = index;
    } else {
      break;
    }
  }
  if (repeatlyIndex === -1) {
    return catalog;
  }
  return catalog.slice(repeatlyIndex + 1);
}

function fillCatalogResult(
  bookSource: BookSource,
  catalogResult: CatalogEntry[],
  contentBlock: ContentBlock,
  useLevel: boolean
) {
  const entry = {name: '', url: '', useLevel: useLevel};
  entry.name = contentBlock.value(bookSource.catalog.name, 'text');
  const attrSrc = contentBlock.value(bookSource.catalog.chapter, 'href');
  if (attrSrc.length === 0) {
    return;
  } else {
    entry.url = attrSrc;
  }
  catalogResult.push(entry);
}

export async function parseCatalog(
  bookSource: BookSource,
  reqData: ReqDataCatalog
) {
  const bsHttpReq = genBsHttpReq(reqData.catalog);
  const response = await makeHttpReq(bsHttpReq);

  let catalogResult: CatalogEntry[] = [];
  const contentBlock = createContentBlock(bsHttpReq.reqUrl, response.data);
  if (!contentBlock) {
    return catalogResult;
  }
  for (const iterator of contentBlock.query(bookSource.catalog.list)) {
    if (bookSource.catalog.booklet) {
      const bookletName = iterator.value(
        bookSource.catalog.booklet.name,
        'text'
      );
      if (bookletName) {
        const entry = {name: bookletName, url: '', useLevel: false};
        catalogResult.push(entry);
      }
      for (const iterator2 of iterator.query(bookSource.catalog.booklet.list)) {
        fillCatalogResult(bookSource, catalogResult, iterator2, true);
      }
    } else {
      fillCatalogResult(bookSource, catalogResult, iterator, false);
    }
  }
  catalogResult = clearRepeatlyCatalogEntry(catalogResult);
  return catalogResult;
}

////////////////////////////////
export interface ReqDataChapter {
  name?: string;
  url: string;
  useLevel?: boolean;
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
  if (text.length === 0) {
    return;
  }
  if (needPurify(bookSource, text)) {
    return;
  }
  allP.push(text);
}

async function parseChapterOnePage(bookSource: BookSource, url: string) {
  const bsHttpReq = genBsHttpReq(url);
  const response = await makeHttpReq(bsHttpReq);

  let allP: string[] = [];

  if (!bookSource.chapter.content) {
    return allP;
  }

  const contentBlock = createContentBlock(bsHttpReq.reqUrl, response.data);
  if (!contentBlock) {
    return allP;
  }

  for (const iterator of contentBlock.query(bookSource.chapter.content)) {
    const text = iterator.text();
    if (text.indexOf('\n') !== -1) {
      for (const subText of text.split('\n')) {
        const subTextAfterTrim = subText.trim();
        if (subTextAfterTrim.length === 0) {
          continue;
        }
        fillAllP(bookSource, allP, subTextAfterTrim);
      }
    } else {
      fillAllP(bookSource, allP, text);
    }
  }
  if (bookSource.chapter.page) {
    const attrHref = contentBlock.value(bookSource.chapter.page, 'href');
    if (attrHref.length > 0) {
      allP = allP.concat(await parseChapterOnePage(bookSource, attrHref));
    }
  }
  return allP;
}

export async function parseChapter(
  bookSource: BookSource,
  reqData: ReqDataChapter
) {
  const bsHttpReq = genBsHttpReq(reqData.url);
  const response = await makeHttpReq(bsHttpReq);

  let allP: string[] = [];
  const chapterResult = {
    content: '',
  };

  if (!bookSource.chapter.content) {
    chapterResult.content = response.data;
    return chapterResult;
  }

  const contentBlock = createContentBlock(bsHttpReq.reqUrl, response.data);
  if (!contentBlock) {
    return chapterResult;
  }

  for (const iterator of contentBlock.query(bookSource.chapter.content)) {
    const text = iterator.text();
    if (text.indexOf('\n') !== -1) {
      for (const subText of text.split('\n')) {
        const subTextAfterTrim = subText.trim();
        fillAllP(bookSource, allP, subTextAfterTrim);
      }
    } else {
      fillAllP(bookSource, allP, text);
    }
  }
  if (bookSource.chapter.page) {
    const attrHref = contentBlock.value(bookSource.chapter.page, 'href');
    if (attrHref.length > 0) {
      allP = allP.concat(await parseChapterOnePage(bookSource, attrHref));
    }
  }
  chapterResult.content = allP.join('\n');
  return chapterResult;
}

////////////////////////////////

interface Author {
  name: string;
}
export interface BookResult {
  author: Author;
  catalog: string;
  cover: string;
  lastChapter: string;
  name: string;
  status: string;
  summary: string;
  update: string;
  bookSource: string;
  toc: CatalogEntry[];
}
export async function parseBook(
  bookSource: BookSource,
  reqData: ReqDataDetail
) {
  const bookResult: BookResult = {
    author: {
      name: '',
    },
    catalog: '',
    cover: '',
    lastChapter: '',
    name: '',
    status: '',
    summary: '',
    update: '',
    bookSource: '',
    toc: [],
  };

  const bookDetail = await parseDetail(bookSource, reqData);
  bookResult.author.name = bookDetail.author;
  bookResult.catalog = bookDetail.catalog;
  bookResult.cover = bookDetail.cover;
  bookResult.lastChapter = bookDetail.lastChapter;
  bookResult.name = bookDetail.name;
  bookResult.status = bookDetail.status;
  bookResult.summary = bookDetail.summary;
  bookResult.update = bookDetail.update;
  const bookCatalog = await parseCatalog(bookSource, bookDetail);
  bookResult.toc = bookCatalog;

  return bookResult;
}
