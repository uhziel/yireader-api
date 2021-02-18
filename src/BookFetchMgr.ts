import {BookInterface} from './models/Book';
import {getBookSource} from './BookSourceMgr';
import {parseCatalog, ReqDataCatalog} from './BookSourceParser';
import {createBookChapters} from './resolvers/BookChapter';

class BookFetchMgr {
  bookIds: string[];

  constructor() {
    this.bookIds = [];
  }

  async add(book: BookInterface) {
    if (this.isFetching(book.id)) {
      return;
    }

    this.bookIds.push(book.id);
    try {
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

        const bookChapters = await createBookChapters(
          bookCatalog.slice(book.spine.length, bookCatalog.length)
        );
        for (const chapter of bookChapters) {
          book.spine.push({
            _id: chapter.id,
            name: chapter.name,
            url: chapter.url,
            chapter: chapter.id,
          });
        }
      }
      book.lastFetchTime = new Date();
      await book.save();
    } finally {
      const pos = this.bookIds.indexOf(book.id);
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
