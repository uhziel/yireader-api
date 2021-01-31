import {getEnabledBookSources} from '../BookSourceMgr';
import {parseSearch} from '../BookSourceParser';
import {Request} from 'express';

interface SearchInput {
  name: string;
}

interface Author {
  name: string;
}

interface SearchResult {
  name: string;
  author: Author;
  summary: string;
  coverUrl: string;
  url: string;
  bookSourceId?: string;
}

export const search = async (args: SearchInput, req: Request) => {
  if (!req.user) {
    return [];
  }
  const searchResults: SearchResult[] = [];
  const bookSources = await getEnabledBookSources(req.user?.id);
  const promises = bookSources.map(bookSource =>
    parseSearch(bookSource, args.name)
  );
  for (const promise of promises) {
    try {
      const res = await promise;
      for (const iterator of res) {
        const searchResult: SearchResult = {
          name: iterator.name,
          author: {
            name: iterator.author,
          },
          summary: iterator.summary,
          coverUrl: iterator.cover,
          url: iterator.detail,
          bookSourceId: iterator.bookSourceId,
        };
        searchResults.push(searchResult);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return searchResults;
};
