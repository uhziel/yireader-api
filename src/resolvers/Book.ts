import Book, {BookInterface, ChapterEntry} from '../models/Book';
import {getBookSource} from '../BookSourceMgr';
import {parseBook, ReqDataDetail} from '../BookSourceParser';
import {getAuthorId} from '../resolvers/Author';
import {createBookChapters} from '../resolvers/BookChapter';
import {createWebResource} from '../resolvers/WebResource';
import {Request} from 'express';
import User from '../models/User';
import fetchMgr from '../BookFetchMgr';
import BookChapter from '../models/BookChapter';

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

const FETCH_INTERVAL = 600000; // 拉取书数据的最小间隔，单位：毫秒

export const books = async (_: unknown, req: Request) => {
  const user = await User.findById(req.user.id, 'books');
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
  return user.books;
};

async function bookFromDb(bookInfo: BookInfo, userId: string) {
  const book = await Book.findOne({_id: bookInfo.bookId, user: userId});
  if (!book) {
    throw new Error('通过书的id查找书失败。');
  }
  await book.populate('author').execPopulate();
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
    book.contentChanged = false;
    await book.save();
  }
  return book;
}

async function getBookByNameAndAuthor(
  userId: string,
  name: string,
  author: string
) {
  const authorId = await getAuthorId(author);
  const book = await Book.findOne({
    user: userId,
    name: name,
    author: authorId,
  });

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

async function bookFromWeb(bookInfo: BookInfo, userId: string) {
  //如果已经有这本书，则直接返回，不再下载
  const book = await getBookByNameAndAuthor(
    userId,
    bookInfo.name,
    bookInfo.author.name
  );
  if (book) {
    await book.populate('author').execPopulate();
    book.inBookshelf = await isInBookshelf(book.id, userId);
    return book;
  }

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

  const authorId = await getAuthorId(result.author.name);

  const cover = await createWebResource({
    url: result.coverUrl,
  });

  const newBook = new Book({
    user: userId,
    name: result.name,
    author: authorId,
    coverUrl: result.coverUrl,
    cover: cover.id,
    lastChapter: result.lastChapter,
    status: result.status,
    summary: result.summary,
    url: bookInfo.url,
    lastUpdateTime: result.update,
    catalogUrl: result.catalog,
    spine: [],
    bookSource: bookInfo.bookSourceId,
  });
  const bookChapters = await createBookChapters(result.spine);
  for (const chapter of bookChapters) {
    newBook.spine.push({
      _id: chapter.id,
      name: chapter.name,
      url: chapter.url,
      chapter: chapter.id,
    });
  }
  await newBook.save();
  await newBook.populate('author').execPopulate();

  const user = await User.findById(userId, 'tmpBooks');
  if (!user) {
    throw new Error('创建书失败，玩家信息出错。');
  }

  user.tmpBooks.push(newBook.id);
  await user.save();
  return newBook;
}

export const book = async (args: BookByInfoInput, req: Request) => {
  if (args.info.bookId) {
    return await bookFromDb(args.info, req.user.id);
  }

  return await bookFromWeb(args.info, req.user.id);
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

interface AddBookToBookShelfInput {
  id: string;
}

export const addBookToBookShelf = async (
  args: AddBookToBookShelfInput,
  req: Request
) => {
  const user = await User.findById(req.user?.id, 'tmpBooks books');
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

//TODO 去掉无用的接口
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
  console.time('parseBook'); //TODO 去除查看性能的代码
  const result = await parseBook(bookSource, reqData);
  console.timeEnd('parseBook');

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
    spine: [],
    bookSource: args.info.bookSourceId,
  });
  const bookChapters = await createBookChapters(result.spine);
  for (const chapter of bookChapters) {
    book.spine.push({
      _id: '',
      name: chapter.name,
      url: chapter.url,
      chapter: chapter.id,
    });
  }
  await book.save();
  await book.populate('author').execPopulate();

  const user = await User.findById(req.user?.id, 'books');
  if (!user) {
    throw new Error('创建书失败，玩家信息出错。');
  }

  user.books.push(book.id);
  await user.save();
  return book;
};

interface DeleteBookInput {
  id: string;
}

export const deleteBook = async (args: DeleteBookInput, req: Request) => {
  const user = await User.findById(req.user?.id, 'books');
  if (!user) {
    throw new Error('删除书失败，玩家信息出错。');
  }
  const pos = user.books.indexOf(args.id);
  if (pos === -1) {
    throw new Error('删除书失败，玩家没有该书');
  }

  const book = await Book.findById(args.id, 'spine');
  if (!book) {
    throw new Error('删除书失败，没找到这本书');
  }

  const deletedChapterIds = book.spine.map(chapter => chapter._id);

  await BookChapter.deleteMany({_id: {$in: deletedChapterIds}});

  user.books.pull(args.id);
  await user.save();

  await Book.deleteOne({_id: args.id, user: req.user.id});
  return true;
};

interface MoveUpBookInput {
  id: string;
}

export const moveUpBook = async (args: MoveUpBookInput, req: Request) => {
  const user = await User.findById(req.user?.id, 'books');
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

export const moveDownBook = async (args: MoveDownBookInput, req: Request) => {
  const user = await User.findById(req.user?.id, 'books');
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
  req: Request
) => {
  const user = await User.findById(req.user?.id, 'books');
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
