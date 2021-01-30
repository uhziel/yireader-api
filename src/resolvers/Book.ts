import Book from '../models/Book';
import bookSourceMgr, {getBookSource} from '../BookSourceMgr';
import {parseBook, ReqDataDetail} from '../BookSourceParser';
import {createAuthor} from '../resolvers/Author';
import {createBookChapters} from '../resolvers/BookChapter';
import {createWebResource} from '../resolvers/WebResource';
import {Request} from 'express';

interface CreateBookInput {
  bookSourceId: string;
  url: string;
}

interface BookInfo {
  name: string;
  author: string;
  summary: string;
  cover: string;
  detail: string;
  bookSourceId: string;
  bookId?: string;
}
interface BookByInfoInput {
  info: BookInfo;
}

export const books = async (_: unknown, req: Request) => {
  const books = await Book.find({user: req.user?.id});
  return await Book.populate(books, 'author');
};

async function bookFromDb(bookInfo: BookInfo, userId: string) {
  const book = await Book.findOne({_id: bookInfo.bookId, user: userId});
  if (!book) {
    throw new Error('通过书的id查找书失败。');
  }
  await book.populate('author').execPopulate();
  return book;
}

async function bookFromWeb(bookInfo: BookInfo) {
  //读取书源
  const bookSource = await getBookSource(bookInfo.bookSourceId);
  if (!bookSource) {
    throw new Error('通过书源id解析书失败。');
  }

  const result = await parseBook(bookSource, bookInfo);
  result.bookSource = bookInfo.bookSourceId;
  return result;
}

export const book = async (args: BookByInfoInput, req: Request) => {
  if (args.info.bookId) {
    return await bookFromDb(args.info, req.user.id);
  }

  return await bookFromWeb(args.info);
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
  const bookChapters = await createBookChapters(result.toc);
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
