import bookSourceMgr from '../BookSourceMgr';
import {parseSearch} from '../BookSourceParser';

interface SearchInput {
  name: string;
}

export const search = async (args: SearchInput) => {
  const searchResult = [];
  const bookSources = bookSourceMgr.getEnabledBookSources(null);
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
