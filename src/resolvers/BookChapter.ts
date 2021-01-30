import BookChapter from '../models/BookChapter';
import bookSourceMgr, {getBookSource} from '../BookSourceMgr';
import {parseChapter, ReqDataChapter} from '../BookSourceParser';

interface BookChapterInfo {
  name: string;
  url: string;
  bookSourceId: string;
  bookChapterId?: string;
}
interface BookChapterInput {
  info: BookChapterInfo;
}

async function bookChapterFromDb(info: BookChapterInfo) {
  const chapter = await BookChapter.findById(info.bookChapterId);
  if (!chapter) {
    return null;
  }

  if (!chapter.data) {
    chapter.firstAccessTime = new Date();
    const chapterURL = new URL(chapter.url);
    const bookSource = bookSourceMgr.getBookSource(chapterURL.hostname);
    if (!bookSource) {
      return;
    }

    const reqData: ReqDataChapter = {
      url: chapter.url,
    };
    chapter.data = (await parseChapter(bookSource, reqData)).content;
    await chapter.save();
  }

  return chapter;
}

async function bookChapterFromWeb(info: BookChapterInfo) {
  //读取书源
  const bookSource = await getBookSource(info.bookSourceId);
  if (!bookSource) {
    throw new Error('通过书源id解析章节失败。');
  }

  const reqData: ReqDataChapter = {
    url: info.url,
  };
  const result = {
    name: info.name,
    data: '',
  };
  result.data = (await parseChapter(bookSource, reqData)).content;
  return result;
}

export const bookChapter = async (args: BookChapterInput) => {
  if (args.info.bookChapterId) {
    return await bookChapterFromDb(args.info);
  }

  return await bookChapterFromWeb(args.info);
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

export const createBookChapters = async (args: CreateBookChapterInput[]) => {
  const chapters = await BookChapter.insertMany(args);
  return chapters;
};
