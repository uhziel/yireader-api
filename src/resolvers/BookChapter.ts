import BookChapter from '../models/BookChapter';
import {getBookSource} from '../BookSourceMgr';
import {parseChapter, ReqDataChapter} from '../BookSourceParser';
import {Request} from 'express';
import Book from '../models/Book';

interface BookChapterInfo {
  bookId: string;
  bookChapterIndex: number;
}
interface BookChapterInput {
  info: BookChapterInfo;
}

interface BookChapterOutput {
  index: number;
  name: string;
  data?: string;
  prev?: BookChapterOutput;
  next?: BookChapterOutput;
}

async function bookChapterFromDb(info: BookChapterInfo, userId: string) {
  const book = await Book.findOne(
    {_id: info.bookId, user: userId},
    'spine bookSource'
  );
  if (!book) {
    throw new Error('通过书的id查找书失败。');
  }

  const chapterEntry = book.spine[info.bookChapterIndex];
  if (!chapterEntry) {
    throw new Error('没找到该章节。');
  }

  const bookSource = await getBookSource(book.bookSource);
  if (!bookSource) {
    throw new Error('通过书源id解析章节失败。');
  }

  const chapter = await BookChapter.findById(chapterEntry._id);
  if (!chapter) {
    return null;
  }

  if (!chapter.data) {
    chapter.firstAccessTime = new Date();

    const reqData: ReqDataChapter = {
      url: chapter.url,
    };
    chapter.data = (await parseChapter(bookSource, reqData)).content;
    await chapter.save();
  }

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
  }
  if (info.bookChapterIndex < book.spine.length - 1) {
    output.next = {
      index: info.bookChapterIndex + 1,
      name: book.spine[info.bookChapterIndex + 1].name,
    };
  }

  return output;
}

export const bookChapter = async (args: BookChapterInput, req: Request) => {
  return await bookChapterFromDb(args.info, req.user.id);
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
