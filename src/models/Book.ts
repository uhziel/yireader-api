import {Schema, Document, model, Types} from 'mongoose';
import {UserInterface} from './User';
import {WebResourceInterface} from './WebResource';
import {AuthorInterface} from './Author';
import {BookSourceInterface} from './BookSource';
import {BookFileInterface} from './BookFile';
import {BookChapterOutput} from '../resolvers/BookChapter';

export interface ChapterEntry {
  _id: Types.ObjectId;
  name: string;
  url: string;
  subEntries?: ChapterEntry[];
}

export interface BookInterface extends Document {
  inBookshelf: boolean;
  user: UserInterface['_id'];
  lastAccessTime: Date;
  name: string;
  author: AuthorInterface['_id'];
  authorName?: string; //TODELETE 临时借用下，后续会删除
  coverUrl: string;
  cover: WebResourceInterface['_id'];
  lastChapter: string;
  status: string;
  summary: string;
  url: string;
  lastUpdateTime: string;
  lastFetchTime: Date;
  catalogUrl: string;
  readingChapterIndex: number;
  readingChapter?: BookChapterOutput;
  spine: Array<ChapterEntry>;
  reverseOrder: boolean;
  contentChanged: boolean;
  bookSource: BookSourceInterface['_id'];
  bookFile: BookFileInterface;
}

const chapterEntrySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  subEntries: [this],
});

const bookSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  lastAccessTime: {
    type: Date,
    default: 0,
  },
  name: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Author',
  },
  coverUrl: String,
  cover: {
    type: Schema.Types.ObjectId,
    ref: 'WebResource',
  },
  lastChapter: String,
  status: String,
  summary: String,
  url: String,
  lastUpdateTime: String,
  lastFetchTime: {
    type: Date,
    default: Date.now,
  },
  catalogUrl: String,
  readingChapterIndex: {
    type: Number,
    default: -1,
  },
  spine: [chapterEntrySchema],
  reverseOrder: {
    type: Boolean,
    default: false,
  },
  contentChanged: {
    type: Boolean,
    default: false,
  },
  bookSource: {
    type: Schema.Types.ObjectId,
    ref: 'BookSource',
  },
  bookFile: {
    type: Schema.Types.ObjectId,
    ref: 'BookFile',
  },
});

bookSchema.index({_id: 1, user: 1});

export default model<BookInterface>('Book', bookSchema);
