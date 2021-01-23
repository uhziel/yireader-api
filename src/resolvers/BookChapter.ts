import BookChapter from '../models/BookChapter';
import bookSourceMgr from '../BookSourceMgr';
import {parseChapter, ReqDataChapter} from '../BookSourceParser';

interface BookChapterInput {
  id: string;
}

export const bookChapter = async (args: BookChapterInput) => {
  const chapter = await BookChapter.findById(args.id);
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
