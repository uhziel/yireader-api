import Book, {BookInterface, ChapterEntry} from '../models/Book';
import User from '../models/User';
import fetchMgr from '../BookFetchMgr';
import {Types} from 'mongoose';
import GCMgr from '../BookGCMgr';

const FETCH_INTERVAL = 10 * 60 * 1000; // 拉取书数据的最小间隔，单位：毫秒
const TMP_BOOK_LIFETIME = 24 * 60 * 60 * 1000; // 临时书的生存时间。单位：毫秒

export async function queryBooks(userId: string) {
  const user = await User.findById(userId, 'books tmpBooks')
    .lean()
    .populate({
      path: 'books',
      populate: {
        path: 'author',
      },
    });
  if (!user) {
    throw new Error('玩家信息不对，无法拉取其书柜信息');
  }
  const now = Date.now();
  for (const book of user.books as BookInterface[]) {
    book.id = book._id;
    book.inBookshelf = true;
    book.authorName = book.author.name;
    if (book.cover) {
      book.coverUrl = '/webresource/' + book.cover.toString();
    }
    if (book.readingChapterIndex > -1) {
      const chapter: ChapterEntry = book.spine[book.readingChapterIndex];
      if (chapter) {
        book.readingChapter = {
          index: book.readingChapterIndex,
          name: chapter.name,
        };
      }
    }
    const timeDiff = now - book.fetchedAt.valueOf();
    if (timeDiff > FETCH_INTERVAL) {
      if (!fetchMgr.isFetching(book.id)) {
        fetchMgr.add(book.id);
      }
    }
  }

  if (user.tmpBooks.length > 0) {
    const bookId: Types.ObjectId = user.tmpBooks[0];
    const timeDiff = now - bookId.getTimestamp().valueOf();
    if (timeDiff > TMP_BOOK_LIFETIME) {
      GCMgr.add(userId, bookId.toHexString());
    }
  }
  return user.books;
}

//TODO 提取自 bookFromDb，考虑下怎么两者合并，主要是去掉对 res.startTime 的依赖
export async function queryBook(bookId: string, userId: string) {
  const book = await Book.findOne(
    {_id: bookId, user: userId},
    {
      'spine.url': 0,
      'spine.chapter': 0,
    }
  )
    .lean()
    .populate('author');
  if (!book) {
    throw new Error('通过书的id查找书失败。');
  }
  book.id = book._id;
  book.inBookshelf = true;
  if (book.readingChapterIndex > -1) {
    const chapter: ChapterEntry = book.spine[book.readingChapterIndex];
    if (chapter) {
      book.readingChapter = {
        index: book.readingChapterIndex,
        name: chapter.name,
      };
    }
  }
  if (book.contentChanged) {
    await Book.updateOne({_id: book._id}, {$set: {contentChanged: false}});
  }
  book.authorName = book.author.name;
  if (book.cover) {
    book.coverUrl = '/webresource/' + book.cover.toString();
  }
  return book;
}
