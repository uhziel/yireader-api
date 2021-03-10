import Book from './models/Book';
import BookChapter from './models/BookChapter';
import User from './models/User';
import WebResource from './models/WebResource';

interface BookGCEntry {
  userId: string;
  bookId: string;
}

class BookGCMgr {
  bookGCEntries: BookGCEntry[];

  constructor() {
    this.bookGCEntries = [];
  }

  async add(userId: string, bookId: string) {
    if (this.isDoing(bookId)) {
      return;
    }

    this.bookGCEntries.push({
      userId: userId,
      bookId: bookId,
    });
    try {
      const user = await User.findById(userId, 'tmpBooks');
      if (!user) {
        throw new Error('自动删除书失败，玩家信息出错。');
      }
      const pos = user.tmpBooks.indexOf(bookId);
      if (pos === -1) {
        throw new Error('自动删除书失败，玩家没有该书');
      }

      const book = await Book.findById(bookId, 'spine cover');
      if (!book) {
        throw new Error('自动删除书失败，没找到这本书');
      }

      const deletedChapterIds = book.spine.map(chapter => chapter._id);

      //TODO 考虑合并两处删除书的地方到一起
      await BookChapter.deleteMany({_id: {$in: deletedChapterIds}});

      if (book.cover) {
        await WebResource.deleteOne({_id: book.cover});
      }

      user.tmpBooks.pull(bookId);
      await user.save();

      await Book.deleteOne({_id: bookId, user: userId});
    } catch (e) {
      console.error(e);
    } finally {
      const index = this.getIndex(bookId);
      if (index !== -1) {
        this.bookGCEntries.splice(index, 1);
      }
    }
  }

  private getIndex(bookId: string): number {
    for (let index = 0; index < this.bookGCEntries.length; index++) {
      const element = this.bookGCEntries[index];
      if (element.bookId === bookId) {
        return index;
      }
    }
    return -1;
  }

  isDoing(bookId: string): boolean {
    return this.getIndex(bookId) !== -1;
  }
}

const mgr = new BookGCMgr();

export default mgr;
