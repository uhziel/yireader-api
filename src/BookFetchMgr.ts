import Book from './models/Book';
import {getBookSource} from './BookSourceMgr';
import {parseCatalog, ReqDataCatalog} from './BookSourceParser';
import {Types} from 'mongoose';

class BookFetchMgr {
  bookIds: string[];

  constructor() {
    this.bookIds = [];
  }

  async add(bookId: string) {
    if (this.isFetching(bookId)) {
      return;
    }

    this.bookIds.push(bookId);
    try {
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error('没有找到书。');
      }
      const bookSource = await getBookSource(book.bookSource);
      if (!bookSource) {
        throw new Error('通过书源id解析书失败。');
      }

      const reqData: ReqDataCatalog = {
        author: '',
        catalog: book.catalogUrl,
        cover: '',
        lastChapter: '',
        name: '',
        status: '',
        summary: '',
        update: '',
      };
      let bookCatalog = await parseCatalog(bookSource, reqData);
      bookCatalog = bookCatalog.filter(entry => entry.url.length > 0);

      if (book.spine.length < bookCatalog.length) {
        //如果有更新，添加标记
        if (!book.contentChanged) {
          book.contentChanged = true;
        }

        const bookChapters = bookCatalog.slice(
          book.spine.length,
          bookCatalog.length
        );
        for (const chapter of bookChapters) {
          book.spine.push({
            _id: Types.ObjectId(),
            name: chapter.name,
            url: chapter.url,
          });
        }
      }
      book.fetchedAt = new Date();
      await book.save();
    } finally {
      const pos = this.bookIds.indexOf(bookId);
      if (pos !== -1) {
        this.bookIds.splice(pos, 1);
      }
    }
  }

  isFetching(bookId: string): boolean {
    return this.bookIds.indexOf(bookId) !== -1;
  }
}

const mgr = new BookFetchMgr();

export default mgr;
