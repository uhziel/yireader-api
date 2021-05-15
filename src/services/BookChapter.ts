import BookChapter from '../models/BookChapter';
import {getBookSource} from '../BookSourceMgr';
import {
  parseChapter,
  ReqDataChapter,
  ChapterContentStyle,
} from '../BookSourceParser';
import Book from '../models/Book';
import fetchMgr from '../BookFetchMgr';

interface BookChapterInfo {
  bookId: string;
  bookChapterIndex: number;
  read: boolean;
}

export interface BookChapterOutput {
  index: number;
  name: string;
  data?: string;
  prev?: BookChapterOutput;
  next?: BookChapterOutput;
}

const FETCH_INTERVAL = 600000; // 拉取书数据的最小间隔，单位：毫秒

//TODO 提取自 bookChapterFromDb，考虑合并两者，抓哟问题是 res.startTime
export async function queryBookChapter(info: BookChapterInfo, userId: string) {
  const book = await Book.findOne(
    {_id: info.bookId, user: userId},
    'spine bookSource catalogUrl contentChanged fetchedAt'
  );
  if (!book) {
    throw new Error('通过书的id查找书失败。');
  }

  const chapterEntry = book.spine[info.bookChapterIndex];
  if (!chapterEntry) {
    throw new Error('没找到该章节。');
  }

  let chapter = await BookChapter.findById(chapterEntry._id);
  if (!chapter) {
    const bookSource = await getBookSource(book.bookSource);
    if (!bookSource) {
      throw new Error('通过书源id解析章节失败。');
    }

    const reqData: ReqDataChapter = {
      url: chapterEntry.url,
    };

    const data = await parseChapter(
      bookSource,
      reqData,
      ChapterContentStyle.Html
    );

    chapter = new BookChapter({
      _id: chapterEntry._id,
      name: chapterEntry.name,
      url: chapterEntry.url,
      firstAccessedAt: info.read ? new Date() : undefined,
      data,
    });

    try {
      await chapter.save();
    } catch (e) {
      if (e.name === 'MongoError' && e.code === 11000) {
        chapter = await BookChapter.findById(chapterEntry._id);
      } else {
        throw e;
      }
    }
  }
  if (!chapter) {
    return null;
  }

  if (info.read) {
    if (!chapter.firstAccessedAt) {
      await BookChapter.updateOne(
        {_id: chapter._id},
        {
          $set: {
            firstAccessedAt: new Date(),
          },
        }
      );
    }
    book.readingChapterIndex = info.bookChapterIndex;
    if (book.contentChanged) {
      book.contentChanged = false;
    }

    await Book.updateOne(
      {_id: book._id},
      {
        $set: {
          readingChapterIndex: book.readingChapterIndex,
          contentChanged: book.contentChanged,
        },
      }
    );
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
    const now = Date.now();
    if (book.spine.length - info.bookChapterIndex < 10) {
      const timeDiff = now - book.fetchedAt.valueOf();
      if (timeDiff > FETCH_INTERVAL) {
        if (!fetchMgr.isFetching(book.id)) {
          fetchMgr.add(book.id);
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
