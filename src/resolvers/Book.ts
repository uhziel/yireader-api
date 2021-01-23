import Book from '../models/Book';
import bookSourceMgr from '../BookSourceMgr';
import {parseBook, ReqDataDetail} from '../BookSourceParser';
import {createAuthor} from '../resolvers/Author';
import {createWebResource} from '../resolvers/WebResource';

interface CreateBookInput {
  bookSourceId: string;
  url: string;
}

export const books = async () => {
  return await Book.find({});
};

export const createBook = async (args: CreateBookInput) => {
  args.bookSourceId = '600bd7031e52d1375f545d0b';
  const detailURL = new URL(args.url);
  const bookSource = bookSourceMgr.getBookSource(detailURL.hostname);
  if (!bookSource) {
    throw new Error(`Cannot find booksource through url: ${args.url}`);
  }
  const reqData: ReqDataDetail = {
    detail: args.url,
  };
  const result = await parseBook(bookSource, reqData);

  const author = await createAuthor({
    name: result.author.name,
  });

  const cover = await createWebResource({
    url: result.cover,
  });

  const book = new Book({
    user: '600bd6eb1e52d1375f545d0a',
    name: result.name,
    author: author.id,
    coverUrl: result.cover,
    cover: cover.id,
    lastChapter: result.lastChapter,
    status: result.status,
    summary: result.summary,
    url: args.url,
    lastUpdateTime: result.update,
    catalogUrl: result.catalog,
    toc: [],
    bookSource: args.bookSourceId,
  });
  for (const chapter of result.chapters) {
    book.toc.push({
      name: chapter.name,
      url: chapter.url,
    });
  }
  await book.save();
  await book.populate('author').execPopulate();
  return book;
};
