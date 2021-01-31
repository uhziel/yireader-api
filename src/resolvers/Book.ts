import Book from '../models/Book';
import {getBookSource} from '../BookSourceMgr';
import {parseBook, ReqDataDetail} from '../BookSourceParser';
import {getAuthorId} from '../resolvers/Author';
import {createBookChapters} from '../resolvers/BookChapter';
import {createWebResource} from '../resolvers/WebResource';
import {Request} from 'express';

interface CreateBookInput {
  info: BookInfo;
}

interface AuthorInput {
  name: string;
}

interface BookInfo {
  name: string;
  author: AuthorInput;
  summary: string;
  coverUrl: string;
  url: string;
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

  const reqDataDetail: ReqDataDetail = {
    name: bookInfo.name,
    author: bookInfo.author.name,
    summary: bookInfo.summary,
    cover: bookInfo.coverUrl,
    detail: bookInfo.url,
  };
  const result = await parseBook(bookSource, reqDataDetail);
  result.bookSource = bookInfo.bookSourceId;
  return result;
}

export const book = async (args: BookByInfoInput, req: Request) => {
  if (args.info.bookId) {
    return await bookFromDb(args.info, req.user.id);
  }

  return await bookFromWeb(args.info);
};

async function haveSameBook(info: BookInfo, userId: string) {
  const authorId = await getAuthorId(info.author.name);
  const isExist = await Book.exists({
    user: userId,
    name: info.name,
    author: authorId,
  });

  return isExist;
}

export const createBook = async (args: CreateBookInput, req: Request) => {
  const isExist = await haveSameBook(args.info, req.user.id);
  if (isExist) {
    throw new Error('你已经添加过这本书');
  }

  const bookSource = await getBookSource(args.info.bookSourceId);
  if (!bookSource) {
    throw new Error(
      `Cannot find booksource. bookSourceId: ${args.info.bookSourceId}`
    );
  }
  const reqData: ReqDataDetail = {
    detail: args.info.url,
  };
  const result = await parseBook(bookSource, reqData);

  const authorId = await getAuthorId(result.author.name);

  const cover = await createWebResource({
    url: result.coverUrl,
  });

  const book = new Book({
    user: req.user?.id,
    name: result.name,
    author: authorId,
    coverUrl: result.coverUrl,
    cover: cover.id,
    lastChapter: result.lastChapter,
    status: result.status,
    summary: result.summary,
    url: args.info.url,
    lastUpdateTime: result.update,
    catalogUrl: result.catalog,
    toc: [],
    bookSource: args.info.bookSourceId,
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

export const deleteBook = async (args: DeleteBookInput, req: Request) => {
  await Book.deleteOne({_id: args.id, user: req.user.id});
  return true;
};
