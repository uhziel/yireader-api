import Book, {BookInterface, ChapterEntry} from '../models/Book';
import {getBookSource} from '../BookSourceMgr';
import {parseBook, ReqDataDetail} from '../BookSourceParser';
import {getAuthorId} from '../resolvers/Author';
import {_createWebResource} from '../resolvers/WebResource';
import User from '../models/User';
import fetchMgr from '../BookFetchMgr';
import BookChapter from '../models/BookChapter';
import {Types} from 'mongoose';
import GCMgr from '../BookGCMgr';
import {GraphQLContext} from '.';
import {Response} from 'express';
import WebResource from '../models/WebResource';

interface BookInfo {
  name: string;
  authorName: string;
  summary: string;
  coverUrl: string;
  url: string;
  bookSourceId: string;
  bookId?: string;
}
interface BookByInfoInput {
  info: BookInfo;
}

const FETCH_INTERVAL = 10 * 60 * 1000; // 拉取书数据的最小间隔，单位：毫秒
const TMP_BOOK_LIFETIME = 24 * 60 * 60 * 1000; // 临时书的生存时间。单位：毫秒

export const books = async (_: unknown, context: GraphQLContext) => {
  const user = await User.findById(context.req.user.id, 'books tmpBooks');
  if (!user) {
    throw new Error('玩家信息不对，无法拉取其书柜信息');
  }
  await user
    .populate({
      path: 'books',
      populate: {
        path: 'author',
      },
    })
    .execPopulate();
  const now = Date.now();
  for (const book of user.books as BookInterface[]) {
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
    const timeDiff = now - book.lastFetchTime.valueOf();
    if (timeDiff > FETCH_INTERVAL) {
      if (!fetchMgr.isFetching(book.id)) {
        fetchMgr.add(book);
      }
    }
  }

  if (user.tmpBooks.length > 0) {
    const bookId: Types.ObjectId = user.tmpBooks[0];
    const timeDiff = now - bookId.getTimestamp().valueOf();
    if (timeDiff > TMP_BOOK_LIFETIME) {
      GCMgr.add(context.req.user.id, bookId.toHexString());
    }
  }
  return user.books;
};

async function bookFromDb(bookId: string, userId: string, res: Response) {
  res.startTime('all', 'all.bookFromDb');
  res.startTime('1', '1.Book.findOne');
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
  res.endTime('1');
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
    res.startTime('2', '2.Book.updateOne.contentChanged');
    await Book.updateOne({_id: book._id}, {$set: {contentChanged: false}});
    res.endTime('2');
  }
  res.endTime('all');
  book.authorName = book.author.name;
  if (book.cover) {
    book.coverUrl = '/webresource/' + book.cover.toString();
  }
  return book;
}

async function getBookByNameAndAuthor(
  userId: string,
  name: string,
  author: string
) {
  const authorId = await getAuthorId(author);
  const book = await Book.findOne(
    {
      user: userId,
      name: name,
      author: authorId,
    },
    {
      'spine.url': 0,
      'spine.chapter': 0,
    }
  ).lean();

  return book;
}

async function isInBookshelf(bookId: string, userId: string) {
  const user = await User.findById(userId, 'books');
  if (!user) {
    return false;
  }

  const pos = user.books.indexOf(bookId);
  return pos !== -1;
}

async function bookFromWeb(bookInfo: BookInfo, userId: string, res: Response) {
  res.startTime('all', 'all.bookFromWeb');
  //如果已经有这本书，则直接返回，不再下载
  res.startTime('1', '1.getBookByNameAndAuthor');
  const book = await getBookByNameAndAuthor(
    userId,
    bookInfo.name,
    bookInfo.authorName
  );
  if (book) {
    book.id = book._id;
    book.authorName = bookInfo.authorName;
    if (book.cover) {
      book.coverUrl = '/webresource/' + book.cover.toString();
    }
    book.inBookshelf = await isInBookshelf(book.id, userId);
    res.endTime('1');
    return book;
  }
  res.endTime('1');

  //读取书源
  res.startTime('2', '2.getBookSource');
  const bookSource = await getBookSource(bookInfo.bookSourceId);
  if (!bookSource) {
    throw new Error('通过书源id解析书失败。');
  }
  res.endTime('2');

  const reqDataDetail: ReqDataDetail = {
    name: bookInfo.name,
    author: bookInfo.authorName,
    summary: bookInfo.summary,
    cover: bookInfo.coverUrl,
    detail: bookInfo.url,
  };
  res.startTime('3', '3.parseBook');
  const result = await parseBook(bookSource, reqDataDetail);
  res.endTime('3');

  res.startTime('4', '4.getAuthorId');
  const authorId = await getAuthorId(result.author.name);
  res.endTime('4');

  res.startTime('5', '5.createWebResourceCover');
  const coverId = Types.ObjectId();
  const bookId = Types.ObjectId();
  const coverPromise = _createWebResource(result.coverUrl, coverId);
  res.endTime('5');

  res.startTime('6', '6.CreateBook');
  const spine: ChapterEntry[] = [];
  res.startTime('6.1', '6.1.spine.push');
  for (const chapter of result.spine) {
    spine.push({
      _id: Types.ObjectId(),
      name: chapter.name,
      url: chapter.url,
    });
  }
  res.endTime('6.1');
  const newBook = {
    _id: bookId,
    user: userId,
    name: result.name,
    author: authorId,
    coverUrl: result.coverUrl,
    lastChapter: result.lastChapter,
    status: result.status,
    summary: result.summary,
    url: bookInfo.url,
    lastUpdateTime: result.update,
    catalogUrl: result.catalog,
    spine,
    bookSource: bookInfo.bookSourceId,
  } as BookInterface;
  res.startTime('6.2', '6.2.Book.insertOne');
  await Book.insertMany(newBook, {rawResult: true, lean: true});
  res.endTime('6.2');
  newBook.id = newBook._id;
  newBook.authorName = bookInfo.authorName;
  res.endTime('6');

  res.startTime('7', '7.User.tmpBooks.push');
  const user = await User.findById(userId, 'tmpBooks');
  if (!user) {
    throw new Error('创建书失败，玩家信息出错。');
  }

  user.tmpBooks.push(newBook.id);
  await user.save();
  res.endTime('7');

  coverPromise
    .then(() => {
      Book.updateOne({_id: bookId}, {$set: {cover: coverId}}).exec();
    })
    .catch(console.error);
  res.endTime('all');
  return newBook;
}

export const book = async (args: BookByInfoInput, context: GraphQLContext) => {
  if (args.info.bookId) {
    return await bookFromDb(args.info.bookId, context.req.user.id, context.res);
  }

  return await bookFromWeb(args.info, context.req.user.id, context.res);
};

interface AddBookToBookShelfInput {
  id: string;
}

export const addBookToBookShelf = async (
  args: AddBookToBookShelfInput,
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'tmpBooks books');
  if (!user) {
    throw new Error('登录信息不对，无法添加该书');
  }

  const pos = user.books.indexOf(args.id);
  if (pos !== -1) {
    throw new Error('书架中已经有该书，不需再次添加');
  }

  const tmpPos = user.tmpBooks.indexOf(args.id);
  if (tmpPos === -1) {
    throw new Error('没有该书的缓存，无法添加');
  }

  user.tmpBooks.pull(args.id);
  user.books.push(args.id);

  await user.save();

  return true;
};

interface DeleteBookInput {
  id: string;
}

export const deleteBook = async (
  args: DeleteBookInput,
  context: GraphQLContext
) => {
  const res = context.res;
  res.startTime('1', '1.User.findById');
  const user = await User.findById(context.req.user?.id, 'books');
  if (!user) {
    throw new Error('删除书失败，玩家信息出错。');
  }
  const pos = user.books.indexOf(args.id);
  if (pos === -1) {
    throw new Error('删除书失败，玩家没有该书');
  }
  res.endTime('1');
  res.startTime('2', '2.Book.findById');
  const book = await Book.findById(args.id, 'spine cover').lean();
  if (!book) {
    throw new Error('删除书失败，没找到这本书');
  }
  res.endTime('2');

  res.startTime('3', '3.books.pull');
  user.books.pull(args.id);
  await user.save();
  res.endTime('3');

  res.startTime('4', '4.Book.deleteOne');
  Book.deleteOne({_id: args.id, user: context.req.user.id}).exec();
  res.endTime('4');

  res.startTime('5', '5.BookChapter.deleteMany');
  const deletedChapterIds = book.spine.map(chapter => chapter._id);
  BookChapter.deleteMany({_id: {$in: deletedChapterIds}}).exec();
  res.endTime('5');

  res.startTime('6', '6.deleteCover');
  if (book.cover) {
    WebResource.deleteOne({_id: book.cover}).exec();
  }
  res.endTime('6');

  return true;
};

interface MoveUpBookInput {
  id: string;
}

export const moveUpBook = async (
  args: MoveUpBookInput,
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'books');
  if (!user) {
    throw new Error('登录信息不对，无法上移该书');
  }

  const pos = user.books.indexOf(args.id);
  if (pos === -1 || pos === 0) {
    throw new Error('无法上移该书');
  }
  const tmp: string = user.books[pos];
  user.books.set(pos, user.books[pos - 1]);
  user.books.set(pos - 1, tmp);
  await user.save();

  return true;
};

interface MoveDownBookInput {
  id: string;
}

export const moveDownBook = async (
  args: MoveDownBookInput,
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'books');
  if (!user) {
    throw new Error('登录信息不对，无法下移该书');
  }

  const pos = user.books.indexOf(args.id);
  if (pos === -1 || pos === user.books.length - 1) {
    throw new Error('无法下移该书');
  }
  const tmp: string = user.books[pos];
  user.books.set(pos, user.books[pos + 1]);
  user.books.set(pos + 1, tmp);
  await user.save();

  return true;
};

interface ReverseOrderBookInput {
  id: string;
  reverse: boolean;
}

export const reverseOrderBook = async (
  args: ReverseOrderBookInput,
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'books');
  if (!user) {
    throw new Error('登录信息不对，无法修改章节排列顺序');
  }

  const pos = user.books.indexOf(args.id);
  if (pos === -1) {
    throw new Error('无法修改章节排列顺序');
  }
  const book = await Book.findById(args.id, 'reverseOrder');
  if (!book) {
    throw new Error('没找到该书，无法修改章节排列顺序');
  }
  if (book.reverseOrder !== args.reverse) {
    book.reverseOrder = args.reverse;
    await book.save();
  }

  return true;
};
