import axios from 'axios';
import {BookSource} from './BookSourceMgr';
import createContentBlock, {ContentBlock} from './ContentBlock';

interface ResDataSearchEntry {
  name: string;
  author: string;
  summary: string;
  cover: string;
  detail: string;
}

type ResDataSearch = ResDataSearchEntry[];

// @post->... https://chimisgo.gitbook.io/booksource/operator/post
const operatorPost = '@post->';
function getSearchUrlStr(url: string): string {
  const postIndex = url.indexOf(operatorPost);
  if (postIndex === -1) {
    return url;
  } else {
    return url.slice(0, postIndex);
  }
}

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

export async function parseSearch(
  bookSource: BookSource,
  searchKey: string
): Promise<ResDataSearch> {
  const searchUrlStr = getSearchUrlStr(bookSource.search.url);
  const response = await makeSearchReq(bookSource.search.url, searchKey);

  const searchResult: ResDataSearch = [];

  const contentBlock = createContentBlock(searchUrlStr, response.data);
  if (!contentBlock) {
    return searchResult;
  }

  for (const iterator of contentBlock.query(bookSource.search.list)) {
    const entry = {name: '', author: '', summary: '', cover: '', detail: ''};
    entry.name = iterator.value(bookSource.search.name, 'text');
    if (bookSource.search.author) {
      entry.author = iterator.value(bookSource.search.author, 'text');
    }
    if (bookSource.search.summary) {
      entry.summary = iterator.value(bookSource.search.summary, 'text');
    }
    if (bookSource.search.cover) {
      const attrCover = iterator.value(bookSource.search.cover, 'src');
      if (attrCover.length === 0) {
        continue;
      } else {
        entry.cover = attrCover;
      }
    }
    const attrDetail = iterator.value(bookSource.search.detail, 'href');
    if (attrDetail.length === 0) {
      continue;
    } else {
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

  const contentBlock = createContentBlock(reqData.detail, response.data);
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
  contentBlock: ContentBlock
) {
  const entry = {name: '', url: '', useLevel: false};
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
  const response = await axios.get(reqData.catalog);
  let catalogResult: CatalogEntry[] = [];
  const contentBlock = createContentBlock(reqData.catalog, response.data);
  if (!contentBlock) {
    return catalogResult;
  }
  for (const iterator of contentBlock.query(bookSource.catalog.list)) {
    if (bookSource.catalog.booklet) {
      for (const iterator2 of iterator.query(bookSource.catalog.booklet.list)) {
        fillCatalogResult(bookSource, catalogResult, iterator2);
      }
    } else {
      fillCatalogResult(bookSource, catalogResult, iterator);
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
  const allP: string[] = [];
  const chapterResult = {
    content: '',
  };

  const contentBlock = createContentBlock(reqData.url, response.data);
  if (!contentBlock) {
    return chapterResult;
  }

  if (!bookSource.chapter.content) {
    chapterResult.content = response.data;
    return chapterResult;
  }

  for (const iterator of contentBlock.query(bookSource.chapter.content)) {
    const text = iterator.text();
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
