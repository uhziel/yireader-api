import * as cheerio from 'cheerio';
import {query as jpQuery, value as jpValue} from 'jsonpath';
import {URL} from 'url';

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
  $parent: cheerio.Cheerio,
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
    const elements = this.blockData.find(exp).toArray();
    return elements.map(
      el => new ContentBlockHtml(this.reqURL, this.$, this.$(el))
    );
  }
  value(exp: string, type: string) {
    let v = extractData(this.blockData, exp, type);
    if (this.reqURL && (type === 'src' || type === 'href')) {
      if (v.indexOf('/') === 0 || v.indexOf('./') === 0) {
        const absoluteURL = new URL(v, this.reqURL);
        absoluteURL.search = '';
        absoluteURL.hash = '';
        v = absoluteURL.toString();
      }
    }
    return v;
  }
  text() {
    return this.blockData.text();
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
        const absoluteURL = new URL(v, this.reqURL);
        absoluteURL.search = '';
        absoluteURL.hash = '';
        v = absoluteURL.toString();
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
