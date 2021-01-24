import {readFileSync} from 'fs';
import BookSource from './models/BookSource';
import {bookSourcesByUserId} from './resolvers/BookSource';

const bookSourceFiles = [
  'jueshitangmen.info.json',
  'www.9txs.com.json',
  'app.youzibank.com.json',
  'dlib.wxlib.cn.json',
  'www.ahlib.com',
  'www.wanbentxt.com.json',
  'www.zhaishuyuan.com.json',
  'www.zongheng.com.json',
  'zuopinj.com.json',
];

// 搜索
interface BookSourceSearch {
  url: string; // 地址 ${key}代表搜索关键词，搜索时自动替换为用户输入的词
  charset?: string; //关键词编码 比如 utf-8
  list: string; // 列表 提取结果元素的相同特征
  name: string; // 书名
  author?: string; // 作者
  cover?: string; // 封面
  summary?: string; // 简介
  detail: string; // 详情地址
}

// 详情
interface BookSourceDetail {
  name?: string; // 书名 搜索无此字段则必填，搜索有此字段选填
  author?: string; // 作者 搜索无此字段则必填，搜索有此字段选填
  cover?: string; // 封面 搜索无此字段则必填，搜索有此字段选填
  summary?: string; // 封面 搜索无此字段则必填，搜索有此字段选填
  status?: string; // 更新状态
  update?: string; // 更新时间
  lastChapter?: string; // 最近一章名字
  catalog?: string; // 目录地址 不填视为目录和详情相同地址
}

// 分卷
interface BookSourceBooklet {
  name: string; // 分卷名
  list: string; // 章节列表
}

// 目录
interface BookSourceCatalog {
  list: string; // 目录 章节或分卷列表
  orderBy?: 0 | 1 | 2 | 3; // TODO 排序方式 0（分卷正序章节正序）1（分卷倒序章节倒序）2（分卷正序章节倒序）3（分卷倒序章节正序）
  booklet?: BookSourceBooklet; // 分卷
  name: string; // 章节标题
  chapter: string; // 章节地址
  page?: string; // TODO 分页 下一页链接元素
}

// 章节
interface BookSourceChapter {
  content?: string; // 正文 当返回txt文本时不需填写该字段
  filter?: string; // TODO 过滤标签 支持CSSQuery和 标签（例如：@div） 不清楚其作用
  purify?: string[]; // 屏蔽规则 这里实际是个屏蔽用的正则表达式。只有正则表达式匹配整个段落，才会净化掉它。
  page?: string; // 分页 下一页链接元素
}

// 书源
export interface BookSource {
  name: string; // 名字 重要！源网站名字，必须标准，禁止使用前缀
  url: string; // 网址 重要！源网站链接 相同的url会被识别为同一个书源。url中请勿填写http或https字样https://www.zongheng.com应写做www.zongheng.com
  version: number; // 版本 重要！默认100（1.0）当内容变化时递增，如101（1.1）
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
      const bookSource = JSON.parse(
        readFileSync('book_sources/' + bookSourceFile, 'utf8')
      );
      if (bookSource) {
        this.bookSources.push(bookSource);
      }
    }
  }

  getBookSource(hostname: string): BookSource | null {
    const hostnameParts = hostname.split('.');
    if (hostnameParts.length > 2) {
      hostname = hostnameParts.slice(-2).join('.');
    }
    for (const bookSource of this.bookSources) {
      if (hostname.indexOf(bookSource.url) !== -1) {
        return bookSource;
      }
      if (bookSource.search.url.indexOf(hostname) !== -1) {
        return bookSource;
      }
      if (bookSource.search.detail.indexOf(hostname) !== -1) {
        return bookSource;
      }
      if (bookSource.detail.catalog) {
        if (bookSource.detail.catalog.indexOf(hostname) !== -1) {
          return bookSource;
        }
      }
      if (bookSource.catalog.chapter.indexOf(hostname) !== -1) {
        return bookSource;
      }
    }
    return null;
  }

  getAllBookSources(): BookSource[] {
    return this.bookSources;
  }

  getEnabledBookSources(enabledUrls: string[] | null): BookSource[] {
    if (!enabledUrls) {
      return this.bookSources.slice(0, 2);
    }
    const result = [];
    for (const iterator of this.bookSources) {
      if (enabledUrls.indexOf(iterator.url) !== -1) {
        result.push(iterator);
      }
    }
    return result;
  }
}

const mgr = new BookSourceMgr();
mgr.init();

export async function getEnabledBookSources(userId: string) {
  const bookSourceDocs = await bookSourcesByUserId(userId, true);

  const bookSources: BookSource[] = [];
  for (const bookSourceDoc of bookSourceDocs) {
    const bookSource = JSON.parse(bookSourceDoc.data);
    if (bookSource) {
      bookSources.push(bookSource);
    }
  }
  return bookSources;
}

export default mgr;
