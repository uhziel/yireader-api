import Book from '../models/Book';
import bookSourceMgr from '../BookSourceMgr';
import {parseBook, ReqDataDetail} from '../BookSourceParser';
import {createAuthor} from '../resolvers/Author';
import {createBookChapters} from '../resolvers/BookChapter';
import {createWebResource} from '../resolvers/WebResource';
import {Request} from 'express';

interface CreateBookInput {
  bookSourceId: string;
  url: string;
}

export const books = async (_: unknown, req: Request) => {
  const books = await Book.find({user: req.user?.id});
  return await Book.populate(books, 'author');
};

export const createBook = async (args: CreateBookInput, req: Request) => {
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
    user: req.user?.id,
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
  const bookChapters = await createBookChapters(result.chapters);
  for (const chapter of bookChapters) {
    book.toc.push({
      name: chapter.name,
      url: chapter.url,
      chapter: chapter.id,
    });
  }
  await book.save();
  await book.populate('author').execPopulate();
  return book;
};

interface DeleteBookInput {
  id: string;
}

export const deleteBook = async (args: DeleteBookInput) => {
  await Book.deleteOne({_id: args.id});
  return true;
};