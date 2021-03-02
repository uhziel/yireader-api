import {Schema, Document, model} from 'mongoose';
export interface BookChapterInterface extends Document {
  name: string;
  url: string;
  firstAccessTime?: Date;
  data: string;
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
  },
  data: {
    type: String,
    required: true,
  },
});

export default model<BookChapterInterface>('BookChapter', bookChapterSchema);
