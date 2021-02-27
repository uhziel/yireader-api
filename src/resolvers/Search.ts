import {getEnabledBookSources} from '../BookSourceMgr';
import {parseSearch} from '../BookSourceParser';
import {GraphQLContext} from '.';

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

export const search = async (args: SearchInput, context: GraphQLContext) => {
  if (!context.req.user) {
    return [];
  }
  const searchResults: SearchResult[] = [];
  context.res.startTime('1', '1.getEnabledBookSources');
  const bookSources = await getEnabledBookSources(context.req.user?.id);
  context.res.endTime('1');
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
      console.error('graphql api search.', e);
    }
  }

  return searchResults;
};
