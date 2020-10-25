import {readFileSync} from 'fs';

const bookSourceFiles = [
  'jueshitangmen.info.json',
  'www.9txs.com.json',
  'zuopinj.com.json',
];

interface BookSourceSearch {
  url: string;
  list: string;
  name: string;
  author: string;
  cover: string;
  summary: string;
  detail: string;
}

interface BookSourceDetail {
  name: string;
  author: string;
  cover: string;
  summary: string;
  status: string;
  update: string;
  lastChapter: string;
  catalog: string;
}

interface BookSourceBooklet {
  name: string;
  list: string;
}

interface BookSourceCatalog {
  list: string;
  booklet: BookSourceBooklet;
  name: string;
  chapter: string;
}

interface BookSourceChapter {
  content: string;
  purify: string[];
}

export interface BookSource {
  name: string;
  url: string;
  version: number;
  search: BookSourceSearch;
  detail: BookSourceDetail;
  catalog: BookSourceCatalog;
  chapter: BookSourceChapter;
}

class BookSourceMgr {
  bookSources: BookSource[];

  constructor() {
    this.bookSources = [];
  }

  init() {
    for (const bookSourceFile of bookSourceFiles) {
      const bookSource = JSON.parse(readFileSync(bookSourceFile, 'utf8'));
      if (bookSource) {
        this.bookSources.push(bookSource);
      }
    }
  }

  getBookSource(hostname: string): BookSource | null {
    for (const bookSource of this.bookSources) {
      if (hostname.indexOf(bookSource.url) !== -1) {
        return bookSource;
      }
    }
    return null;
  }

  getAllBookSources(): BookSource[] {
    return this.bookSources;
  }
}

const mgr = new BookSourceMgr();
mgr.init();

export default mgr;
