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
export function extractData(
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
