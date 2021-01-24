import {getEnabledBookSources} from '../BookSourceMgr';
import {parseSearch} from '../BookSourceParser';
import {Request} from 'express';

interface SearchInput {
  name: string;
}

export const search = async (args: SearchInput, req: Request) => {
  if (!req.user) {
    return [];
  }
  const searchResult = [];
  const bookSources = await getEnabledBookSources(req.user?.id);
  const promises = bookSources.map(bookSource =>
    parseSearch(bookSource, args.name)
  );
  for (const promise of promises) {
    try {
      const res = await promise;
      searchResult.push(...res);
    } catch (e) {
      console.error(e);
    }
  }

  return searchResult;
};
