import {Schema, Document, model} from 'mongoose';
import {UserInterface} from './User';
import {WebResourceInterface} from './WebResource';
import {AuthorInterface} from './Author';
import {BookChapterInterface} from './BookChapter';
import {BookSourceInterface} from './BookSource';
import {BookFileInterface} from './BookFile';

interface ChapterEntry {
  name: string;
  url: string;
  chapter?: BookChapterInterface['_id'];
  subEntries?: ChapterEntry[];
}

export interface BookInterface extends Document {
  inBookshelf: boolean;
  user: UserInterface['_id'];
  lastAccessTime: Date;
  name: string;
  author: AuthorInterface['_id'];
  coverUrl: string;
  cover: WebResourceInterface['_id'];
  lastChapter: string;
  status: string;
  summary: string;
  url: string;
  lastUpdateTime: string;
  lastFetchTime: Date;
  catalogUrl: string;
  toc: ChapterEntry[];
  bookSource: BookSourceInterface;
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
  chapter: {
    type: Schema.Types.ObjectId,
    ref: 'BookChapter',
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
    default: 0,
  },
  catalogUrl: String,
  toc: [chapterEntrySchema!]!,
  bookSource: {
    type: Schema.Types.ObjectId,
    ref: 'BookSource',
  },
  bookFile: {
    type: Schema.Types.ObjectId,
    ref: 'BookFile',
  },
});

export default model<BookInterface>('Book', bookSchema);
