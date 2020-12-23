import * as cheerio from 'cheerio';
import {query as jpQuery, value as jpValue} from 'jsonpath';
import {URL} from 'url';

interface ReplaceExp {
  old: string;
  new: string;
}

export interface HeadersExp {
  [key: string]: string;
}

interface BsExp {
  selector: string;
  replace: ReplaceExp | null;
  attr: string | null;
  match: string | null;
  textSelector: string | null;
  post: string | null;
  headers: HeadersExp;
}

export function genBsExp(exp: string): BsExp {
  const partsExp = exp.split('@');
  const result: BsExp = {
    selector: partsExp[0],
    replace: null,
    attr: null,
    match: null,
    textSelector: null,
    post: null,
    headers: {},
  };
  for (let index = 1; index < partsExp.length; index++) {
    const operatorExp = partsExp[index];
    if (operatorExp.length === 0) {
      continue;
    }

    const parts = operatorExp.split('->');
    if (parts[0] === 'post') {
      // @post->... https://chimisgo.gitbook.io/booksource/operator/post
      if (parts.length === 2) {
        result.post = parts[1];
      }
    } else if (parts[0] === 'header') {
      // @header->...:... https://chimisgo.gitbook.io/booksource/operator/header
      if (parts.length === 2) {
        const headerStr = parts[1];
        const headerParts = headerStr.split(':');
        if (headerParts.length === 2) {
          result.headers[headerParts[0]] = headerParts[1];
        }
      }
    } else if (parts[0] === 'replace') {
      // @replace->...->... https://chimisgo.gitbook.io/booksource/operator/replace
      if (parts.length === 3) {
        result.replace = {
          old: parts[1],
          new: parts[2],
        };
      }
    } else if (parts[0] === 'attr') {
      // @attr->... https://chimisgo.gitbook.io/booksource/operator/attr
      if (parts.length === 2) {
        result.attr = parts[1];
      }
    } else if (parts[0] === 'match') {
      // @match->... https://chimisgo.gitbook.io/booksource/operator/match
      if (parts.length === 2) {
        result.match = parts[1];
      }
    } else if (parts[0] === 'textSelector') {
      // @textSelector->... 我自定义的，因为 css selectors 不能筛选内容，这里筛选下最终内容
      if (parts.length === 2) {
        result.textSelector = parts[1];
      }
    }
  }

  return result;
}

/**
 * 从 dom 中提取出文本
 */
function extractData(
  $parent: cheerio.Cheerio,
  exp: string,
  type: string
): string {
  const bsExp = genBsExp(exp);
  let tmp = '';
  if (bsExp.textSelector) {
    const selectorText = $parent.find(bsExp.selector).text();
    if (!selectorText.match(bsExp.textSelector)) {
      return tmp;
    }
  }
  if (bsExp.attr) {
    const res = $parent.find(bsExp.selector).attr(bsExp.attr);
    if (res) {
      tmp = res;
    }
  } else if (type === 'text') {
    tmp = $parent.find(bsExp.selector).text();
  } else if (type === 'href' || type === 'src') {
    const res = $parent.find(bsExp.selector).attr(type);
    if (res) {
      tmp = res;
    }
  }

  if (bsExp.replace) {
    tmp = tmp.replace(bsExp.replace.old, bsExp.replace.new);
  } else if (bsExp.match) {
    const matchRes = tmp.match(new RegExp(bsExp.match, 's'));
    if (matchRes) {
      tmp = matchRes[0];
    }
  }
  tmp = tmp.trim();
  return tmp;
}

const $PARAMS = '$params.';
/**
 * 从 javascript object 中提取出文本
 */
function extractJsonData(
  reqUrl: URL | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  exp: string
): string {
  if (exp.indexOf('$.') === 0) {
    return jpValue(obj, exp);
  }
  const toMap: {[key: string]: string} = {};
  exp.match(/\$\{\S+?\}/g)?.forEach(function (tmpl) {
    if (!toMap[tmpl]) {
      const tmplName = tmpl.slice(2, -1);
      if (tmplName.indexOf($PARAMS) === 0) {
        if (reqUrl) {
          const v = reqUrl.searchParams.get(tmplName.slice($PARAMS.length));
          if (v) {
            toMap[tmpl] = v;
          }
        }
      } else {
        toMap[tmpl] = jpValue(obj, tmplName);
      }
    }
  });
  for (const key in toMap) {
    const element = toMap[key];
    while (exp.indexOf(key) !== -1) {
      exp = exp.replace(key, element);
    }
  }
  return exp;
}

export interface ContentBlock {
  query(exp: string): ContentBlock[];
  value(exp: string, type: string): string;
  text(): string;
}

function makeExpValid(exp: string): string {
  let tmp = exp.replace(/\[\s*([^"' ]+?)\s*=\s*([^"' ]+?)\s*\]/g, "[$1='$2']");
  tmp = tmp.replace(/:matches\((.+)\)$/, '@textSelector->$1');
  return tmp;
}

class ContentBlockHtml implements ContentBlock {
  reqURL: URL | null;
  blockData: cheerio.Cheerio;
  $: cheerio.Root;
  constructor(reqURL: URL | null, $: cheerio.Root, data: cheerio.Cheerio) {
    this.reqURL = reqURL;
    this.$ = $;
    this.blockData = data;
  }

  query(exp: string): ContentBlock[] {
    const gtMatch = exp.match(/(.*):gt\((\d+)\)\w*$/);
    let gtValue = -1;
    if (gtMatch) {
      exp = gtMatch[1];
      gtValue = parseInt(gtMatch[2]);
    }
    const elements = this.blockData
      .find(exp)
      .slice(gtValue + 1)
      .toArray();
    return elements.map(
      el => new ContentBlockHtml(this.reqURL, this.$, this.$(el))
    );
  }
  value(exp: string, type: string) {
    exp = makeExpValid(exp);
    let v = extractData(this.blockData, exp, type);
    if (this.reqURL && (type === 'src' || type === 'href')) {
      const absoluteURL = new URL(v, this.reqURL);
      absoluteURL.search = '';
      absoluteURL.hash = '';
      v = absoluteURL.toString();
    }
    return v;
  }
  text() {
    // 没法直接使用 this.blocakData.text()，因为它不能很好处理 <br>
    // 看了 cheerio text() 的实现，重新实现下让其支持 <br>
    // https://sourcegraph.com/github.com/cheeriojs/cheerio@main/-/blob/lib/static.js#L159:9
    return this.renderText(this.blockData.toArray());
  }

  private renderText(elems: cheerio.Element[]) {
    let ret = '';
    const len = elems.length;

    for (let i = 0; i < len; i++) {
      const elem = elems[i];
      if (elem.type === 'text') ret += elem.data;
      else if (elem.type === 'tag' && elem.tagName === 'br') ret += '\n';
      else if (
        elem.children &&
        elem.type !== 'comment' &&
        elem.tagName !== 'script' &&
        elem.tagName !== 'style'
      ) {
        ret += this.renderText(elem.children);
      }
    }

    return ret;
  }
}

class ContentBlockJson implements ContentBlock {
  reqURL: URL | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(reqURL: URL | null, data: any) {
    this.reqURL = reqURL;
    this.blockData = data;
  }

  query(exp: string): ContentBlock[] {
    const elements = jpQuery(this.blockData, exp);
    return elements.map(el => new ContentBlockJson(this.reqURL, el));
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value(exp: string, type: string) {
    let v = extractJsonData(this.reqURL, this.blockData, exp);
    if (this.reqURL && (type === 'src' || type === 'href')) {
      if (v.indexOf('/') === 0 || v.indexOf('./') === 0) {
        const parts = v.split('?');
        const absoluteURL = new URL(parts[0], this.reqURL);
        absoluteURL.search = '';
        absoluteURL.hash = '';
        v = absoluteURL.toString();
        if (parts[1]) {
          v = v + '?' + parts[1];
        }
      }
    }
    return v;
  }
  text() {
    return this.value('$', '');
  }
}

export default function createContentBlock(
  reqUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseData: any
): ContentBlock | null {
  let reqURL: URL | null = null;
  if (reqUrl.length > 0) {
    reqURL = new URL(reqUrl);
  }
  if (typeof responseData === 'string') {
    const $ = cheerio.load(responseData);
    return new ContentBlockHtml(reqURL, $, $.root());
  } else {
    return new ContentBlockJson(reqURL, responseData);
  }
}
