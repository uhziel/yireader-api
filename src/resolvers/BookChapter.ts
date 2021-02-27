import BookChapter from '../models/BookChapter';
import {getBookSource} from '../BookSourceMgr';
import {parseChapter, ReqDataChapter} from '../BookSourceParser';
import {Response} from 'express';
import Book from '../models/Book';
import fetchMgr from '../BookFetchMgr';
import {GraphQLContext} from './index';

interface BookChapterInfo {
  bookId: string;
  bookChapterIndex: number;
}
interface BookChapterInput {
  info: BookChapterInfo;
}

export interface BookChapterOutput {
  index: number;
  name: string;
  data?: string;
  prev?: BookChapterOutput;
  next?: BookChapterOutput;
}

const FETCH_INTERVAL = 600000; // 拉取书数据的最小间隔，单位：毫秒

async function bookChapterFromDb(
  info: BookChapterInfo,
  userId: string,
  res: Response
) {
  res.startTime('db1', '1.Book.findById');
  const book = await Book.findById(
    info.bookId,
    'user spine bookSource catalogUrl contentChanged lastFetchTime'
  );
  if (book?.user.toString() !== userId) {
    throw new Error('抛出错误');
  }
  if (!book) {
    throw new Error('通过书的id查找书失败。');
  }

  const chapterEntry = book.spine[info.bookChapterIndex];
  if (!chapterEntry) {
    throw new Error('没找到该章节。');
  }
  res.endTime('db1');

  res.startTime('db2', '2.BookChapter.findById');
  const chapter = await BookChapter.findById(chapterEntry._id);
  if (!chapter) {
    return null;
  }

  if (!chapter.data) {
    chapter.firstAccessTime = new Date();

    const bookSource = await getBookSource(book.bookSource);
    if (!bookSource) {
      throw new Error('通过书源id解析章节失败。');
    }

    const reqData: ReqDataChapter = {
      url: chapter.url,
    };
    res.startTime('web', '2.1.parseChapter');
    chapter.data = (await parseChapter(bookSource, reqData)).content;
    res.endTime('web');
    res.startTime('db3', '2.2.BookChapter.save');
    await chapter.save();
    res.endTime('db3');
  }

  book.readingChapterIndex = info.bookChapterIndex;
  if (book.contentChanged) {
    book.contentChanged = false;
  }
  res.endTime('db2');
  res.startTime('db4', '3.Book.save');
  await Book.updateOne(
    {_id: book._id},
    {
      $set: {
        readingChapterIndex: book.readingChapterIndex,
        contentChanged: book.contentChanged,
      },
    }
  );
  res.endTime('db4');

  const output: BookChapterOutput = {
    index: info.bookChapterIndex,
    name: chapter.name,
    data: chapter.data,
  };

  if (info.bookChapterIndex > 0) {
    output.prev = {
      index: info.bookChapterIndex - 1,
      name: book.spine[info.bookChapterIndex - 1].name,
    };
    const now = Date.now();
    if (book.spine.length - info.bookChapterIndex < 10) {
      const timeDiff = now - book.lastFetchTime.valueOf();
      if (timeDiff > FETCH_INTERVAL) {
        if (!fetchMgr.isFetching(book.id)) {
          fetchMgr.add(book);
        }
      }
    }
  }
  if (info.bookChapterIndex < book.spine.length - 1) {
    output.next = {
      index: info.bookChapterIndex + 1,
      name: book.spine[info.bookChapterIndex + 1].name,
    };
  }

  return output;
}

export const bookChapter = async (
  args: BookChapterInput,
  context: GraphQLContext
) => {
  return await bookChapterFromDb(args.info, context.req.user.id, context.res);
};

interface CreateBookChapterInput {
  name: string;
  url: string;
}

export const createBookChapter = async (args: CreateBookChapterInput) => {
  const bookChapter = new BookChapter({
    name: args.name,
    url: args.url,
  });
  await bookChapter.save();
  return bookChapter;
};

export async function createBookChapters(args: CreateBookChapterInput[]) {
  const chapters = await BookChapter.insertMany(args);
  return chapters;
}
