import {Schema, Document, model} from 'mongoose';
import {WebResourceInterface} from './WebResource';

export interface BookChapterInterface extends Document {
  name: string;
  url: string;
  firstAccessTime: Date;
  data: WebResourceInterface['_id'];
}

const bookChapterSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  firstAccessTime: {
    type: Date,
    default: 0,
  },
  data: {
    type: Schema.Types.ObjectId,
    ref: 'WebResource',
  },
});

export default model<BookChapterInterface>('BookChapter', bookChapterSchema);
